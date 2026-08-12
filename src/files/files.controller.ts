import { Controller, Get, Post, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Body, BadRequestException, Req, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_MAX_FILE_SIZE_MB = 10;
const getMaxFileSizeBytes = (): number => {
  const raw = process.env.MAX_UPLOAD_MB;
  const mb = raw ? Number.parseInt(raw, 10) : NaN;
  const safe = Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_FILE_SIZE_MB;
  return safe * 1024 * 1024;
};

const tmpDir = path.join(process.cwd(), '.tmp', 'multer');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* noop */ }

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  private readonly logger = new Logger(FilesController.name);
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, tmpDir),
      filename: (_req, file, cb) => {
        const ext = (file.originalname.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '');
        cb(null, `${uuidv4()}.${ext}`);
      },
    }),
      limits: {
        fileSize: getMaxFileSizeBytes(),
        fields: 10,
        headerPairs: 200,
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
    @Req() req?: any,
  ) {
    const t0 = Date.now();
    const bufferLen = (file && !file.path && Buffer.isBuffer(file.buffer)) ? file.buffer.length : null;
    this.logger.debug(
      `[uploadFile.ctrl] received Multer file at t=${Date.now() - t0}ms original=${file?.originalname} size=${file?.size}B type=${file?.mimetype} path=${file?.path ?? '(no disk path)'} bufferLen=${bufferLen ?? 'N/A'} content-length=${req?.headers?.['content-length'] ?? '?'}B`,
    );
    if (!file) throw new BadRequestException('No file provided');
    return this.filesService.uploadFile(file, description);
  }

  @Get()
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/url')
  getUrl(@Param('id') id: string, @Req() req: any) {
    return this.filesService.getUrl(id, req);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }
}
