import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class FilesService {
    private prisma;
    private configService;
    private s3Client;
    private bucketName;
    private useS3;
    constructor(prisma: PrismaService, configService: ConfigService);
    uploadFile(file: Express.Multer.File, description?: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        size: number;
        description: string | null;
    }>;
    findAll(): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        size: number;
        description: string | null;
    }[]>;
    findOne(id: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        size: number;
        description: string | null;
    }>;
    remove(id: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        size: number;
        description: string | null;
    }>;
    getUrl(id: string, req: {
        protocol: string;
        get(header: string): string;
    }): Promise<{
        url: string;
        size: number;
        originalName: string;
    }>;
}
