import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucketName: string;
  private useS3: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || 'real-estate-bucket';
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.useS3 = !!(region && accessKeyId && secretAccessKey);
  }

  async uploadFile(file: Express.Multer.File, description?: string) {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `uploads/${fileName}`;

    try {
      let publicPath: string;
      if (this.useS3) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );
        publicPath = key; // Store object key; bucket is private
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const fullPath = path.join(uploadsDir, fileName);
        await fs.promises.writeFile(fullPath, file.buffer);
        publicPath = `/uploads/${fileName}`;
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
      console.error('Error uploading to S3:', error);
      throw new InternalServerErrorException('Error uploading file');
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

    console.log('=== DELETING FILE ===');
    console.log('File ID:', id);
    console.log('File path:', file.path);
    console.log('Use S3:', this.useS3);

    // Extract key from path
    let key: string | undefined;
    
    if (this.useS3) {
      // Handle different path formats for S3
      if (file.path.includes('.amazonaws.com/')) {
        // Format: https://bucket-name.s3.region.amazonaws.com/uploads/filename.ext
        key = file.path.split('.amazonaws.com/')[1];
      } else if (file.path.includes('.com/')) {
        // Generic format with .com/
        key = file.path.split('.com/')[1];
      } else {
        // Direct key format: uploads/filename.ext
        key = file.path;
      }
      console.log('Extracted S3 key:', key);
    } else {
      // Local storage
      if (file.path.startsWith('/uploads/')) {
        key = file.path.replace('/uploads/', 'uploads/');
      } else {
        key = file.path;
      }
      console.log('Local file path:', key);
    }

    if (key) {
      try {
        if (this.useS3) {
          console.log('Deleting from S3 bucket:', this.bucketName, 'Key:', key);
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: key,
            }),
          );
          console.log('Successfully deleted from S3');
        } else {
          const localPath = path.join(process.cwd(), key);
          console.log('Deleting local file:', localPath);
          await fs.promises.unlink(localPath).catch((err) => {
            console.error('Error deleting local file:', err);
          });
          console.log('Successfully deleted local file');
        }
      } catch (error) {
        console.error('Error deleting file from storage:', error);
        // Continue to delete from DB even if storage deletion fails
      }
    } else {
      console.warn('Could not extract key from path, skipping storage deletion');
    }

    const deletedFile = await this.prisma.file.delete({
      where: { id },
    });
    
    console.log('File deleted from database');
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
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 60 * 10 }); // 10 minutes
      return { url, size: file.size, originalName: file.originalName };
    }
    const url = `${req.protocol}://${req.get('host')}${file.path}`;
    return { url, size: file.size, originalName: file.originalName };
  }
}
