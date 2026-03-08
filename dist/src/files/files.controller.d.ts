import { FilesService } from './files.service';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    uploadFile(file: Express.Multer.File, description?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        path: string;
        size: number;
        description: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        path: string;
        size: number;
        description: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        path: string;
        size: number;
        description: string | null;
    }>;
    getUrl(id: string, req: any): Promise<{
        url: string;
        size: number;
        originalName: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        originalName: string;
        fileName: string;
        path: string;
        size: number;
        description: string | null;
    }>;
}
