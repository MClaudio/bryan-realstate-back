import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const DEFAULT_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_SOCKET_TIMEOUT_MS = 20 * 60 * 1000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 60 * 1000;
const DEFAULT_MAX_FILE_SIZE_MB = 10;

const parseIntegerMs = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseIntegerMb = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private useS3: boolean;
  private maxUploadMb: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || 'real-estate-bucket';
    this.useS3 = !!(region && accessKeyId && secretAccessKey);
    this.maxUploadMb = parseIntegerMb(
      this.configService.get<string>('MAX_UPLOAD_MB'),
      DEFAULT_MAX_FILE_SIZE_MB,
    );

    const requestTimeout = parseIntegerMs(
      this.configService.get<string>('AWS_REQUEST_TIMEOUT_MS'),
      DEFAULT_REQUEST_TIMEOUT_MS,
    );
    const socketTimeout = parseIntegerMs(
      this.configService.get<string>('AWS_SOCKET_TIMEOUT_MS'),
      DEFAULT_SOCKET_TIMEOUT_MS,
    );
    const connectionTimeout = parseIntegerMs(
      this.configService.get<string>('AWS_CONNECTION_TIMEOUT_MS'),
      DEFAULT_CONNECTION_TIMEOUT_MS,
    );

    this.s3Client = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      requestHandler: new NodeHttpHandler({
        httpsAgent: new https.Agent({
          keepAlive: true,
          maxSockets: 50,
          rejectUnauthorized: true,
          timeout: socketTimeout,
        }),
        httpAgent: new http.Agent({
          keepAlive: true,
          maxSockets: 50,
          timeout: socketTimeout,
        }),
        connectionTimeout,
        requestTimeout,
        socketTimeout,
      }),
      retryMode: 'adaptive',
    });

    this.logger.log(
      `FilesService initialized: storage=${this.useS3 ? 'S3' : 'LOCAL'} | bucket=${this.bucketName} | maxUpload=${this.maxUploadMb}MB | requestTimeout=${Math.round(requestTimeout / 1000)}s`,
    );
  }

  async uploadFile(file: Express.Multer.File, description?: string) {
    const sizeMb = file.size / (1024 * 1024);
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `uploads/${fileName}`;

    this.logger.log(
      `UPLOAD START: name=${file.originalname} | type=${file.mimetype} | size=${file.size}B (~${sizeMb.toFixed(2)}MB) | key=${key}`,
    );

    if (sizeMb > this.maxUploadMb) {
      const msg = `El archivo pesa ${sizeMb.toFixed(2)}MB y el límite es ${this.maxUploadMb}MB`;
      this.logger.warn(`UPLOAD REJECTED (oversized): ${msg}`);
      throw new BadRequestException(msg);
    }

    const startedAt = Date.now();
    try {
      let publicPath: string;
      if (this.useS3) {
        this.logger.log(`UPLOAD S3: sending PutObjectCommand to s3://${this.bucketName}/${key} ...`);
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentLength: file.size,
            CacheControl: file.mimetype.startsWith('image/') ? 'public, max-age=31536000, immutable' : undefined,
          }),
        );
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
        this.logger.log(`UPLOAD S3 SUCCESS: key=${key} elapsed=${elapsed}s`);
        publicPath = key;
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const fullPath = path.join(uploadsDir, fileName);
        this.logger.log(`UPLOAD LOCAL: writing to ${fullPath} ...`);
        await fs.promises.writeFile(fullPath, file.buffer);
        publicPath = `/uploads/${fileName}`;
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
        this.logger.log(`UPLOAD LOCAL SUCCESS: path=${publicPath} elapsed=${elapsed}s`);
      }

      return this.prisma.file.create({
        data: {
          originalName: file.originalname,
          fileName: fileName,
          path: publicPath,
          size: file.size,
          description: description,
        },
      });
    } catch (error) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
      this.logger.error(
        `UPLOAD FAILED after ${elapsed}s for key=${key}. Original=${file.originalname} size=${file.size}B: ${
          error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Error uploading file. Check server logs for more details.',
      );
    }
  }

  async findAll() {
    return this.prisma.file.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return file;
  }

  async remove(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`File with ID ${id} not found`);

    this.logger.log('=== DELETING FILE ===');
    this.logger.log(`File ID: ${id}`);
    this.logger.log(`File path: ${file.path}`);
    this.logger.log(`Use S3: ${this.useS3}`);

    let key: string | undefined;

    if (this.useS3) {
      if (file.path.includes('.amazonaws.com/')) {
        key = file.path.split('.amazonaws.com/')[1];
      } else if (file.path.includes('.com/')) {
        key = file.path.split('.com/')[1];
      } else {
        key = file.path;
      }
      this.logger.log(`Extracted S3 key: ${key}`);
    } else {
      if (file.path.startsWith('/uploads/')) {
        key = file.path.replace('/uploads/', 'uploads/');
      } else {
        key = file.path;
      }
      this.logger.log(`Local file path: ${key}`);
    }

    if (key) {
      try {
        if (this.useS3) {
          this.logger.log(`Deleting from S3 bucket: ${this.bucketName}, key: ${key}`);
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: key,
            }),
          );
          this.logger.log('Successfully deleted from S3');
        } else {
          const localPath = path.join(process.cwd(), key);
          this.logger.log(`Deleting local file: ${localPath}`);
          await fs.promises.unlink(localPath).catch((err) => {
            this.logger.error('Error deleting local file:', err);
          });
          this.logger.log('Successfully deleted local file');
        }
      } catch (error) {
        this.logger.error('Error deleting file from storage:', error);
      }
    } else {
      this.logger.warn('Could not extract key from path, skipping storage deletion');
    }

    const deletedFile = await this.prisma.file.delete({
      where: { id },
    });

    this.logger.log('File deleted from database');
    return deletedFile;
  }

  async getUrl(id: string, req: { protocol: string; get(header: string): string }) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`File with ID ${id} not found`);

    if (this.useS3) {
      let key = file.path;
      if (key.includes('.amazonaws.com/')) {
        key = key.split('.amazonaws.com/')[1];
      }
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const expiresInSec = 60 * 10;
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSec });
      this.logger.debug(`Signed URL for ${id} expires in ${expiresInSec}s`);
      return { url, size: file.size, originalName: file.originalName };
    }
    const url = `${req.protocol}://${req.get('host')}${file.path}`;
    return { url, size: file.size, originalName: file.originalName };
  }
}
