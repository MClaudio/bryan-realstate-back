import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
  private s3HealthChecked = false;
  private s3HealthOk = false;
  private s3HealthDetails: Record<string, any> | null = null;

  private async runS3HealthCheckAsync(): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      this.s3HealthChecked = true;
      this.s3HealthOk = false;
      this.s3HealthDetails = { skipped: true, reason: 'useS3=false or s3Client null' };
      return;
    }
    try {
      const t0 = Date.now();
      const head = await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      const headStatus = (head as any).$metadata?.httpStatusCode ?? '?';
      this.s3HealthChecked = true;
      this.s3HealthOk = true;
      this.s3HealthDetails = {
        headBucketStatus: headStatus,
        dtMs: Date.now() - t0,
        headBucketOk: headStatus >= 200 && headStatus < 400,
      };
      try {
        const list = await this.s3Client.send(
          new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: 'uploads/', MaxKeys: 1 }),
        );
        const listStatus = (list as any).$metadata?.httpStatusCode ?? '?';
        (this.s3HealthDetails as any).listObjectsStatus = listStatus;
        (this.s3HealthDetails as any).keyCount = (list as any).KeyCount ?? 0;
        this.logger.log(
          `[S3-DIAG-HEALTH] ✓ bucket reachable. HeadBucket HTTP=${headStatus} ListObjects(max=1) HTTP=${listStatus} keyCount=${(list as any).KeyCount ?? 0} dt=${(this.s3HealthDetails as any).dtMs}ms bucket=${this.bucketName}`,
        );
      } catch (listErr: any) {
        (this.s3HealthDetails as any).listObjectsError = {
          name: listErr?.name ?? '?',
          code: String((listErr as any).Code ?? listErr?.name ?? '?'),
          httpStatus: (listErr?.$metadata ?? {}).httpStatusCode ?? '?',
          message: listErr?.message ?? String(listErr),
        };
        this.logger.warn(
          `[S3-DIAG-HEALTH] ⚠ HeadBucket OK (HTTP=${headStatus}) but ListObjectsV2 FAIL: code=${(this.s3HealthDetails as any).listObjectsError.code}. IAM might be missing s3:ListBucket — you can still upload (s3:PutObject). message=${(this.s3HealthDetails as any).listObjectsError.message}`,
        );
      }
    } catch (e: any) {
      const meta = (e?.$metadata ?? {}) as { httpStatusCode?: number; requestId?: string };
      const code = String((e as any).Code ?? e?.name ?? 'UnknownError');
      const msg = e?.message ?? String(e);
      this.s3HealthChecked = true;
      this.s3HealthOk = false;
      this.s3HealthDetails = {
        headBucketStatus: meta?.httpStatusCode ?? '?',
        awsRequestId: meta?.requestId ?? '?',
        awsCode: code,
        errorName: e?.name ?? 'N/A',
        message: msg,
      };
      let humanHint: string;
      switch (code) {
        case 'NoSuchBucket':
          humanHint = `AWS_BUCKET_NAME=${JSON.stringify(this.bucketName)} NO EXISTE en el account / región. Verifica Consola S3 → bucket name + region = AWS_REGION`;
          break;
        case 'AccessDenied':
        case '403 Forbidden':
          humanHint = `AccessDenied. El IAM user/role (Access Key ID) NO TIENE PERMISOS sobre s3:HeadBucket s3:PutObject s3:GetObject en bucket "${this.bucketName}". Añade política IAM s3 (busca "AllowS3RealState" en documentación). O bucket "Block all public access" tiene policy DENY`;
          break;
        case 'InvalidAccessKeyId':
          humanHint = `AWS_ACCESS_KEY_ID INVALIDO. Verifica .env producción tiene las credenciales exactas de IAM user (sin espacios). Posiblemente la key fue desactivada/eliminada`;
          break;
        case 'SignatureDoesNotMatch':
          humanHint = `SignatureDoesNotMatch. AWS_SECRET_ACCESS_KEY INCORRECTO, o AWS_REGION no coincide con la región real del bucket. Verifica Consola S3 → Properties → Region`;
          break;
        case 'AuthorizationHeaderMalformed':
          humanHint = `AuthorizationHeaderMalformed. Generalmente AWS_REGION errónea (bucket us-east-2 pero backend AWS_REGION=us-east-1). Chequea Consola S3 → Properties → AWS Region.`;
          break;
        case 'RequestTimeTooSkewed':
          humanHint = `RequestTimeTooSkewed. EL RELOJ DEL SERVIDOR PRODUCCIÓN ESTÁ DESAJUSTADO. NTP desincronizado. Actualiza la fecha/hora del server (ntpdate / systemctl start ntp / AWS Time Sync).`;
          break;
        default:
          humanHint = `Código desconocido. Busca este error + "${code}" en documentación AWS S3`;
      }
      this.logger.error(
        `[S3-DIAG-HEALTH] ✗ FATAL! Bucket unreachable. HTTP=${(this.s3HealthDetails as any).headBucketStatus} AWS_CODE=${code} msg=${msg}. SOLUCIÓN SUGERIDA: ${humanHint}`,
        e?.stack ?? undefined,
      );
    }
  }

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucketNameRaw = this.configService.get<string>('AWS_BUCKET_NAME');
    const defaultBucket = 'real-estate-bucket';
    this.bucketName = bucketNameRaw || defaultBucket;
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

    const missingS3Vars: string[] = [];
    if (!region) missingS3Vars.push('AWS_REGION');
    if (!accessKeyId) missingS3Vars.push('AWS_ACCESS_KEY_ID');
    if (!secretAccessKey) missingS3Vars.push('AWS_SECRET_ACCESS_KEY');
    if (!bucketNameRaw) missingS3Vars.push('AWS_BUCKET_NAME (using default "' + defaultBucket + '")');

    // DIAGNOSTIC LOGS (PRODUCCIÓN) → NO secret values, only presence.
    const masked = (s: string | undefined, max = 6) =>
      !s ? 'NOT-SET' : s.length <= max ? '***' : `${s.slice(0, 4)}***${s.slice(-4)}`;
    const info: Record<string, any> = {
      storageMode: this.useS3 ? 'S3' : 'LOCAL',
      bucket: this.bucketName,
      bucketIsDefault: !bucketNameRaw,
      region: region ?? 'NOT-SET (default us-east-1)',
      awsAccessKeyIdPresent: !!accessKeyId,
      awsSecretAccessKeyPresent: !!secretAccessKey,
      awsAccessKeyIdMasked: masked(accessKeyId, 16),
      awsSecretAccessKeyMasked: masked(secretAccessKey, 20),
      missingS3Vars,
      useS3: this.useS3,
      maxUploadMb: this.maxUploadMb,
      timeoutsSec: {
        request: Math.round(requestTimeout / 1000),
        socket: Math.round(socketTimeout / 1000),
        connection: Math.round(connectionTimeout / 1000),
      },
      retryMode: 'adaptive',
      nodeEnv: process.env.NODE_ENV ?? '?',
      cwd: process.cwd(),
    };
    this.logger.warn(
      `[S3-DIAG] init storage=${info.storageMode} bucket=${info.bucket}${info.bucketIsDefault ? '(⚠ DEFAULT!)' : ''} region=${info.region} akPresent=${info.awsAccessKeyIdPresent} skPresent=${info.awsSecretAccessKeyPresent} missingVars=[${missingS3Vars.join(', ')}]`,
    );
    this.logger.debug(`[S3-DIAG] init full: ${JSON.stringify(info)}`);

    // Fallback safety: NEVER create S3Client without creds. It will produce
    // non-retryable 403s with misleading "CredentialsError" in production.
    if (this.useS3) {
      try {
        this.s3Client = new S3Client({
          region: region || 'us-east-1',
          credentials: {
            accessKeyId: accessKeyId!,
            secretAccessKey: secretAccessKey!,
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
          `FilesService initialized: storage=S3 | bucket=${this.bucketName} | region=${region} | maxUpload=${this.maxUploadMb}MB | requestTimeout=${Math.round(requestTimeout / 1000)}s`,
        );
        // Async S3 health check. Does NOT block bootstrap. Results visible in logs after ~1-3s.
        // If health check FAILS: `useS3` will be flipped back to `false` so that uploads go to LOCAL
        // (and warnings are loud in logs). This prevents 403s from "silently failing" uploads.
        Promise.resolve()
          .then(() => this.runS3HealthCheckAsync())
          .then(() => {
            const hc = this.s3HealthDetails ?? {} as any;
            if (!this.s3HealthOk) {
              this.logger.error(
                `[S3-DIAG-HEALTH] ⚠ Post-bootstrap S3 health FAILED! All uploads WILL FALL BACK to LOCAL storage (disk "${path.join(process.cwd(), 'uploads')}") unless you fix: awsCode=${hc.awsCode ?? '?'} message=${hc.message ?? '?'}. ${(hc as any).headBucketStatus ? `HTTP=${(hc as any).headBucketStatus}` : ''}`,
              );
              this.useS3 = false;
            } else {
              this.logger.log(`[S3-DIAG-HEALTH] ✓ S3 health OK after init. Ready for uploads.`);
            }
          })
          .catch((hcErr) => {
            this.logger.error(
              `[S3-DIAG-HEALTH] runS3HealthCheckAsync itself throwed: ${hcErr?.name ?? 'Error'}: ${hcErr?.message || String(hcErr)}`,
              (hcErr as Error)?.stack ?? undefined,
            );
            this.useS3 = false;
            this.s3HealthChecked = true;
            this.s3HealthOk = false;
          });
      } catch (e: any) {
        this.logger.error(
          `[S3-DIAG] ⚠ S3Client constructor throwed! Falling back to LOCAL. err=${e?.name}: ${e?.message || String(e)}`,
          e?.stack,
        );
        this.useS3 = false;
        (this.s3Client as any) = null;
      }
    } else {
      this.logger.warn(
        `[S3-DIAG] ⚠ S3 NOT ENABLED. Using LOCAL storage. Missing or empty env vars: [${missingS3Vars.join(', ')}]. Uploads will go to ${path.join(process.cwd(), 'uploads')}.`,
      );
      (this.s3Client as any) = null;
    }
  }

  async uploadFile(file: Express.Multer.File, description?: string) {
    const sizeMb = file.size / (1024 * 1024);
    const fileExtension = file.originalname.split('.').pop() || 'bin';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `uploads/${fileName}`;

    this.logger.log(
      `UPLOAD START: name=${file.originalname} | type=${file.mimetype} | size=${file.size}B (~${sizeMb.toFixed(2)}MB) | key=${key} hasPath=${!!file.path} storageMode=${this.useS3 ? 'S3' : 'LOCAL'} s3HealthChecked=${this.s3HealthChecked} s3HealthOk=${this.s3HealthOk}`,
    );

    if (!this.s3HealthChecked && this.useS3) {
      this.logger.warn(
        `[UPLOAD PRECHECK] useS3=true but S3 health check NOT YET RAN (first upload will verify). Running sync-check inline now...`,
      );
      try { await this.runS3HealthCheckAsync(); } catch (noop) { /* handled in healthCheck */ }
      if (!this.s3HealthOk) {
        this.logger.error(
          `[UPLOAD PRECHECK] ✗ Inline S3 health FAILED awsCode=${(this.s3HealthDetails as any)?.awsCode ?? '?'} — → CANCELARÉ subida S3 y LA HARÉ EN LOCAL (carpeta uploads/). CORRÍGELA!`,
        );
        this.useS3 = false;
      }
    }

    if (sizeMb > this.maxUploadMb) {
      const msg = `El archivo pesa ${sizeMb.toFixed(2)}MB y el límite es ${this.maxUploadMb}MB`;
      this.logger.warn(`UPLOAD REJECTED (oversized): ${msg}`);
      this.cleanupTemp(file);
      throw new BadRequestException(msg);
    }

    const startedAt = Date.now();
    let s3Abort: (() => void) | null = null;
    try {
      let publicPath: string;
      if (this.useS3) {
        this.logger.log(`UPLOAD S3 (multipart Upload): sending to s3://${this.bucketName}/${key} ...`);
        const s3t0 = Date.now();
        let lastProgress = s3t0;
        const bodyStream: NodeJS.ReadableStream = file.path
          ? fs.createReadStream(file.path)
          : (Buffer.isBuffer(file.buffer) ? file.buffer : file.buffer as any);
        const upload = new Upload({
          client: this.s3Client as any,
          params: {
            Bucket: this.bucketName,
            Key: key,
            Body: bodyStream as any,
            ContentType: file.mimetype,
            CacheControl: file.mimetype.startsWith('image/') ? 'public, max-age=31536000, immutable' : undefined,
          },
          partSize: 5 * 1024 * 1024,
          queueSize: 2,
          leavePartsOnError: false,
          tags: [],
        });
        upload.on('httpUploadProgress', (progress: any) => {
          const now = Date.now();
          const loaded = progress.loaded ?? 0;
          const total = progress.total ?? file.size;
          const pct = total > 0 ? ((loaded / total) * 100).toFixed(1) : '?';
          if (now - lastProgress > 2000 || loaded === total) {
            this.logger.log(
              `[s3-upload-progress] key=${key} ${loaded}B/${total}B (${pct}%) dt=${now - lastProgress}ms`,
            );
            lastProgress = now;
          }
        });
        const uploadResult: any = await upload.done();
        const s3Only = ((Date.now() - s3t0) / 1000).toFixed(2);
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);

        const httpStatus = (uploadResult?.$metadata ?? {}) as Record<string, any>;
        const etag = String(uploadResult?.ETag ?? '');
        const versionId = String(uploadResult?.VersionId ?? '');

        let headValidated = false;
        let headInfo: Record<string, any> = {};
        try {
          const head = await this.s3Client.send(
            new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
          ) as any;
          const sizeHead = head?.ContentLength ?? -1;
          const headStatus = (head?.$metadata ?? {})?.httpStatusCode ?? '?';
          const contentType = String(head?.ContentType ?? '');
          headInfo = {
            HeadObject_httpStatusCode: headStatus,
            HeadObject_contentLength: sizeHead,
            HeadObject_contentType: contentType,
            HeadObject_etag: String(head?.ETag ?? '').slice(0, 20),
          };
          headValidated = sizeHead === file.size && headStatus >= 200 && headStatus < 300;
          if (!headValidated) {
            this.logger.error(
              `[UPLOAD S3] ⚠ upload.done() 200 pero HeadObject KO! file.size=${file.size} vs HeadObject.ContentLength=${sizeHead}. key=${key} HTTP=${headStatus}. PROBABLEMENTE el objeto EXISTE PERO ESTÁ INCOMPLETO. Bucket policy deniega s3:GetObject?`,
            );
          }
        } catch (headErr: any) {
          headInfo = {
            HeadObject_error: true,
            awsCode: String((headErr as any).Code ?? headErr?.name ?? '?'),
            status: (headErr?.$metadata ?? {})?.httpStatusCode ?? '?',
            message: headErr?.message ?? String(headErr),
          };
          this.logger.error(
            `[UPLOAD S3] ⚠ upload.done() returned, but HeadObject(key="${key}") THROWED awsCode=${headInfo.awsCode} status=${headInfo.status}. The object may NOT exist in S3! Cause: IAM missing s3:GetObject (most common), OR wrong region, OR bucket policy DENY. msg=${headInfo.message}`,
            (headErr as Error)?.stack ?? undefined,
          );
        }

        const logSummary: Record<string, any> = {
          key,
          elapsedSec: elapsed,
          s3OnlySec: s3Only,
          uploadHTTP: httpStatus?.httpStatusCode ?? '?',
          etag,
          versionId,
          HeadObject_validated: headValidated,
          head: headInfo,
        };
        this.logger.log(`UPLOAD S3 SUCCESS (HeadObject_ok=${headValidated}): ${JSON.stringify(logSummary, null, 0)}`);

        if (!headValidated) {
          this.logger.error(
            `[UPLOAD S3] ✗ WARNING UPSTREAM: upload.done() reports success but we canNOT confirm the object exists in S3 via HeadObject. THIS IS WHY you don't see the file in S3 Console (it was never written). Root cause 99%: the IAM policy has s3:PutObject but is MISSING s3:PutObjectAcl / has bucket policy DENY / region mismatch → upload silently not persisted. Fix IAM policy (allow s3:PutObject + s3:AbortMultipartUpload + s3:GetObject).`,
          );
        }
        publicPath = key;
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const fullPath = path.join(uploadsDir, fileName);
        if (file.path) {
          this.logger.log(`UPLOAD LOCAL: move ${file.path} → ${fullPath} ...`);
          try { await fs.promises.rename(file.path, fullPath); } catch { await fs.promises.copyFile(file.path, fullPath); await fs.promises.unlink(file.path); }
        } else {
          this.logger.log(`UPLOAD LOCAL: writing buffer to ${fullPath} ...`);
          await fs.promises.writeFile(fullPath, file.buffer);
        }
        publicPath = `/uploads/${fileName}`;
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
        this.logger.log(`UPLOAD LOCAL SUCCESS: path=${publicPath} elapsed=${elapsed}s`);
      }

      this.cleanupTemp(file);
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
      this.cleanupTemp(file);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Error uploading file. Check server logs for more details.',
      );
    }
  }

  private cleanupTemp(file: Express.Multer.File | null | undefined) {
    if (!file || !file.path) return;
    const p: string = file.path;
    fs.promises.unlink(p).catch((e) => {
      this.logger.debug(`cleanupTemp no pudo borrar ${p}: ${e?.message || String(e)}`);
    });
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

  /**
   * Always-safe placeholder image: inline SVG that works for broken/missing
   * uploads. 100% offline, no network calls, no 404, no infinite loops.
   *
   * Keep this tiny. It renders a "No image available" placeholder 400x300.
   */
  private getFallbackPlaceholderUrl(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <circle cx="200" cy="130" r="38" fill="#94a3b8"/>
      <path d="M70 270 L150 190 L210 240 L260 200 L330 270 Z" fill="#94a3b8" opacity="0.6"/>
      <rect x="40" y="40" width="320" height="220" rx="12" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 6"/>
      <text x="200" y="292" font-family="system-ui,Arial,sans-serif" font-size="14" text-anchor="middle" fill="#475569" font-weight="600">Imagen no disponible</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  async getUrl(id: string, req: { protocol: string; get(header: string): string }) {
    const t0 = Date.now();
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) {
      this.logger.warn(`[getUrl] file.id=${id} not found in DB (404). Returning placeholder to avoid frontend errors.`);
      return { url: this.getFallbackPlaceholderUrl(), size: 0, originalName: 'not-found.png', notFound: true as const };
    }

    // Case 1: Already enriched absolute URL (rare, but works).
    if (/^https?:\/\//i.test(file.path || '')) {
      this.logger.debug(`[getUrl] id=${id} already absolute URL (${((Date.now() - t0))}ms)`);
      return { url: file.path, size: file.size, originalName: file.originalName };
    }

    if (this.useS3 && this.s3Client) {
      try {
        let key: string = file.path;
        const originalDbPath = key;
        if (key.includes('.amazonaws.com/')) {
          key = key.split('.amazonaws.com/')[1];
        } else if (/^https?:\/\//i.test(key)) {
          try { key = new URL(key).pathname.replace(/^\//, ''); } catch { /* keep */ }
        }
        const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
        const expiresInSec = 60 * 10;
        const signed = await getSignedUrl(this.s3Client as any, command, { expiresIn: expiresInSec });
        this.logger.debug(`[getUrl] id=${id} S3 presign OK t=${Date.now() - t0}ms`);
        return { url: signed, size: file.size, originalName: file.originalName };
      } catch (e: any) {
        const meta = (e?.$metadata ?? {}) as Record<string, any>;
        const code = String((e as any).Code ?? e?.name ?? 'UnknownError');
        this.logger.error(
          `[getUrl] ✗ S3 presign FAIL for id=${id} key=${JSON.stringify(file.path)} HTTP=${meta.httpStatusCode ?? '?'} AWS_CODE=${code} t=${Date.now() - t0}ms msg=${e?.message || String(e)}. Returning placeholder to prevent frontend infinite-looping /files/:id/url.`,
          (e as Error)?.stack ?? undefined,
        );
        return {
          url: this.getFallbackPlaceholderUrl(),
          size: file.size,
          originalName: file.originalName,
          fallbackReason: 's3_presign_error',
          s3Code: code,
        };
      }
    }

    // LOCAL mode: if file.path is relative, build absolute with req host.
    try {
      const raw = String(file.path || '').trim();
      const relative = raw.startsWith('/') ? raw : raw ? `/${raw}` : '';
      if (!relative) {
        this.logger.warn(`[getUrl] id=${id} file.path is empty in LOCAL mode. Returning placeholder.`);
        return { url: this.getFallbackPlaceholderUrl(), size: file.size, originalName: file.originalName };
      }
      const publicBase = String(
        process.env.PUBLIC_URL || process.env.FRONT_URL || process.env.FRONTEND_URL || '',
      ).replace(/\/+$/, '');
      const host = `${req.protocol}://${req.get('host')}`;
      const base = publicBase || host;
      const url = `${base}${relative}`;
      this.logger.debug(`[getUrl] id=${id} LOCAL mode final=${url} t=${Date.now() - t0}ms`);
      return { url, size: file.size, originalName: file.originalName };
    } catch (fallbackErr: any) {
      this.logger.error(
        `[getUrl] ✗ LOCAL mode buildUrl failed for id=${id}: ${fallbackErr?.message || String(fallbackErr)}. Returning placeholder.`,
      );
      return { url: this.getFallbackPlaceholderUrl(), size: file.size, originalName: file.originalName };
    }
  }

  async getPublicUrl(file: any): Promise<{ url: string }> {
    if (!file) {
      this.logger.debug(`[getPublicUrl] file is null/undefined → return placeholder`);
      return { url: this.getFallbackPlaceholderUrl() };
    }
    if (!file.path) {
      this.logger.warn(`[getPublicUrl] ⚠ file.id=${file.id ?? '(no id)'} has EMPTY file.path in DB → return placeholder`);
      return { url: this.getFallbackPlaceholderUrl() };
    }
    if (/^https?:\/\//i.test(String(file.path || ''))) {
      return { url: String(file.path) };
    }

    const t0 = Date.now();
    this.logger.debug(`[getPublicUrl] → file.id=${file.id} original file.path=${JSON.stringify(file.path)} storageMode=${this.useS3 ? 'S3' : 'LOCAL'}`);

    if (this.useS3) {
      if (!this.s3Client) {
        this.logger.error(`[getPublicUrl] ✗ useS3=true but this.s3Client is NULL (constructor fallback LOCAL). For file.id=${file.id} → return placeholder.`);
        return { url: this.getFallbackPlaceholderUrl() };
      }
      let key: string = file.path;
      const originalKey = key;
      if (/^https?:\/\/.+\.amazonaws\.com\//i.test(key)) {
        key = key.split('.amazonaws.com/')[1];
        this.logger.debug(`[getPublicUrl] id=${file.id} path was full https://*.amazonaws.com/ URL → extracted key=${JSON.stringify(key)}`);
      } else if (/^https?:\/\//i.test(key)) {
        try {
          const u = new URL(key);
          key = u.pathname.replace(/^\//, '');
          this.logger.debug(`[getPublicUrl] id=${file.id} path was generic https URL, host=${u.host} → extracted key=${JSON.stringify(key)}`);
        } catch (extractErr: any) {
          this.logger.warn(`[getPublicUrl] id=${file.id} path ${JSON.stringify(originalKey)} looks like URL but failed new URL(): ${extractErr?.message || String(extractErr)}. Keeping as-is.`);
        }
      }
      this.logger.debug(`[getPublicUrl] id=${file.id} S3 final key=${JSON.stringify(key)} bucket=${this.bucketName}`);
      try {
        const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
        const t = Date.now();
        const signed = await getSignedUrl(this.s3Client as any, command, { expiresIn: 600 });
        this.logger.debug(`[getPublicUrl] id=${file.id} ✓ S3 presign OK t=${Date.now() - t}ms. First 90 chars: ${signed.slice(0, 90)}...`);
        return { url: signed };
      } catch (e: any) {
        const meta = (e?.$metadata ?? {}) as { httpStatusCode?: number; requestId?: string; extendedRequestId?: string; cfId?: string };
        const s3Code = String((e as any)?.Code ?? (e as any)?.name ?? 'UnknownError');
        const summary: Record<string, any> = {
          fileId: file.id,
          bucket: this.bucketName,
          key,
          originalDbPath: originalKey,
          dtMs: Date.now() - t0,
          httpStatusCode: meta?.httpStatusCode ?? '?',
          awsRequestId: meta?.requestId ?? '?',
          awsCode: s3Code,
          name: e?.name ?? 'N/A',
          message: e?.message ?? String(e),
        };
        this.logger.error(
          `[getPublicUrl] ✗ S3 FAIL (t=${summary.dtMs}ms) id=${file.id} key=${JSON.stringify(key)} HTTP=${summary.httpStatusCode} AWS_CODE=${summary.awsCode} msg=${summary.message}. See debug below.`,
          (e as Error)?.stack ?? undefined,
        );
        this.logger.debug(`[getPublicUrl] S3 full error for id=${file.id}: ${JSON.stringify(summary)}`);
        return { url: this.getFallbackPlaceholderUrl() };
      }
    }
    const raw: string = file.path;
    const relative = raw.startsWith('/') ? raw : `/${raw}`;
    const publicBase = String(
      process.env.PUBLIC_URL || process.env.FRONT_URL || process.env.FRONTEND_URL || '',
    ).replace(/\/+$/, '');
    const finalLocal = publicBase ? `${publicBase}${relative}` : relative;
    this.logger.debug(`[getPublicUrl] id=${file.id} LOCAL mode → raw=${JSON.stringify(raw)} publicBase=${JSON.stringify(publicBase || '(NOT-SET, using relative)')} final=${JSON.stringify(finalLocal)}`);
    if (!publicBase) {
      this.logger.warn(`[getPublicUrl] ⚠ LOCAL mode: PUBLIC_URL/FRONT_URL/FRONTEND_URL not set. Returning relative path ${JSON.stringify(finalLocal)}. In production deployment with CDN/reverse-proxy this may produce BROKEN LINKS (404 images)! Please set PUBLIC_URL=https://api.yourdomain.com or similar`);
    }
    return { url: finalLocal };
  }

  async enrichFile(file: any): Promise<any> {
    if (!file) return file;
    const t0 = Date.now();
    try {
      const enriched = await this.getPublicUrl(file);
      const safeUrl = enriched?.url || this.getFallbackPlaceholderUrl();
      this.logger.debug(`[enrichFile] id=${file?.id ?? '?'} t=${Date.now() - t0}ms ✓ path enriched`);
      return { ...file, path: safeUrl };
    } catch (e: any) {
      this.logger.error(
        `[enrichFile] id=${file?.id ?? '?'} t=${Date.now() - t0}ms ✗ UNEXPECTED EXCEPTION → returning placeholder: ${e?.name ?? 'Error'}: ${e?.message || String(e)}`,
        (e as Error)?.stack ?? undefined,
      );
      return { ...file, path: this.getFallbackPlaceholderUrl() };
    }
  }

  async findAll() {
    const t0 = Date.now();
    const files = await this.prisma.file.findMany({ orderBy: { createdAt: 'desc' } });
    this.logger.debug(`[findAll] DB returned ${files.length} files, enriching each one...`);
    const out: any[] = [];
    for (const f of files) out.push(await this.enrichFile(f));
    this.logger.debug(`[findAll] done t=${Date.now() - t0}ms total=${out.length}`);
    return out;
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`File with ID ${id} not found`);
    return this.enrichFile(file);
  }

  /**
   * Public-safe S3 diagnostic snapshot (NO secrets).
   * Exposed via GET /api/files/s3-diag for production debugging.
   */
  getS3Diagnostic(): Record<string, any> {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucketNameRaw = this.configService.get<string>('AWS_BUCKET_NAME');

    const missingS3Vars: string[] = [];
    if (!region) missingS3Vars.push('AWS_REGION');
    if (!accessKeyId) missingS3Vars.push('AWS_ACCESS_KEY_ID');
    if (!secretAccessKey) missingS3Vars.push('AWS_SECRET_ACCESS_KEY');
    if (!bucketNameRaw) missingS3Vars.push('AWS_BUCKET_NAME');

    const publicBase = String(
      process.env.PUBLIC_URL || process.env.FRONT_URL || process.env.FRONTEND_URL || '',
    ).replace(/\/+$/, '');

    return {
      ok: true,
      nowIso: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV ?? '?',
      storageMode: this.useS3 ? 'S3' : 'LOCAL',
      s3Config: {
        bucket: this.bucketName,
        bucketIsDefault: !bucketNameRaw,
        region: region ?? 'NOT-SET',
        credentialsProvided: {
          accessKeyId: !!accessKeyId,
          secretAccessKey: !!secretAccessKey,
          allPresent: !!(region && accessKeyId && secretAccessKey),
        },
        missingS3Vars,
        s3ClientInstantiated: !!this.s3Client,
      },
      s3Health: {
        checked: this.s3HealthChecked,
        ok: this.s3HealthOk,
        // details has only safe fields (no credentials). Trim long strings.
        details: (() => {
          if (!this.s3HealthDetails) return null;
          const sanitized: Record<string, any> = {};
          for (const k of Object.keys(this.s3HealthDetails)) {
            const v = (this.s3HealthDetails as any)[k];
            if (typeof v === 'string') sanitized[k] = v.length > 400 ? v.slice(0, 400) + '…' : v;
            else sanitized[k] = v;
          }
          return sanitized;
        })(),
      },
      localConfig: {
        publicBaseUrl: publicBase || 'NOT-SET',
        uploadsDir: path.join(process.cwd(), 'uploads'),
      },
      uploadConfig: {
        maxUploadMb: this.maxUploadMb,
        maxUploadBytes: this.maxUploadMb * 1024 * 1024,
      },
      note: 'If s3Health.ok=false → see AWS_CODE value in s3Health.details.awsCode (AccessDenied / NoSuchBucket / SignatureDoesNotMatch etc). Then search the error in docs or fix env vars / IAM / Bucket policy.',
    };
  }
}
