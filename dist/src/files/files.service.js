"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const prisma_service_1 = require("../prisma/prisma.service");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let FilesService = class FilesService {
    prisma;
    configService;
    s3Client;
    bucketName;
    useS3;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.bucketName = this.configService.get('AWS_BUCKET_NAME') || 'real-estate-bucket';
        this.s3Client = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
            },
        });
        const region = this.configService.get('AWS_REGION');
        const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
        this.useS3 = !!(region && accessKeyId && secretAccessKey);
    }
    async uploadFile(file, description) {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${(0, uuid_1.v4)()}.${fileExtension}`;
        const key = `uploads/${fileName}`;
        try {
            let publicPath;
            if (this.useS3) {
                await this.s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }));
                publicPath = key;
            }
            else {
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
        }
        catch (error) {
            console.error('Error uploading to S3:', error);
            throw new common_1.InternalServerErrorException('Error uploading file');
        }
    }
    async findAll() {
        return this.prisma.file.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const file = await this.prisma.file.findUnique({
            where: { id },
        });
        if (!file) {
            throw new common_1.NotFoundException(`File with ID ${id} not found`);
        }
        return file;
    }
    async remove(id) {
        const file = await this.prisma.file.findUnique({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException(`File with ID ${id} not found`);
        console.log('=== DELETING FILE ===');
        console.log('File ID:', id);
        console.log('File path:', file.path);
        console.log('Use S3:', this.useS3);
        let key;
        if (this.useS3) {
            if (file.path.includes('.amazonaws.com/')) {
                key = file.path.split('.amazonaws.com/')[1];
            }
            else if (file.path.includes('.com/')) {
                key = file.path.split('.com/')[1];
            }
            else {
                key = file.path;
            }
            console.log('Extracted S3 key:', key);
        }
        else {
            if (file.path.startsWith('/uploads/')) {
                key = file.path.replace('/uploads/', 'uploads/');
            }
            else {
                key = file.path;
            }
            console.log('Local file path:', key);
        }
        if (key) {
            try {
                if (this.useS3) {
                    console.log('Deleting from S3 bucket:', this.bucketName, 'Key:', key);
                    await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: this.bucketName,
                        Key: key,
                    }));
                    console.log('Successfully deleted from S3');
                }
                else {
                    const localPath = path.join(process.cwd(), key);
                    console.log('Deleting local file:', localPath);
                    await fs.promises.unlink(localPath).catch((err) => {
                        console.error('Error deleting local file:', err);
                    });
                    console.log('Successfully deleted local file');
                }
            }
            catch (error) {
                console.error('Error deleting file from storage:', error);
            }
        }
        else {
            console.warn('Could not extract key from path, skipping storage deletion');
        }
        const deletedFile = await this.prisma.file.delete({
            where: { id },
        });
        console.log('File deleted from database');
        return deletedFile;
    }
    async getUrl(id, req) {
        const file = await this.prisma.file.findUnique({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException(`File with ID ${id} not found`);
        if (this.useS3) {
            let key = file.path;
            if (key.includes('.amazonaws.com/')) {
                key = key.split('.amazonaws.com/')[1];
            }
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 60 * 10 });
            return { url, size: file.size, originalName: file.originalName };
        }
        const url = `${req.protocol}://${req.get('host')}${file.path}`;
        return { url, size: file.size, originalName: file.originalName };
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], FilesService);
//# sourceMappingURL=files.service.js.map