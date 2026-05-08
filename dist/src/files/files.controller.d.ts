import { FilesService } from './files.service';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    uploadFile(file: Express.Multer.File, description?: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        originalName: string;
        fileName: string;
        size: number;
    }>;
    findAll(): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        originalName: string;
        fileName: string;
        size: number;
    }[]>;
    findOne(id: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        originalName: string;
        fileName: string;
        size: number;
    }>;
    getUrl(id: string, req: any): Promise<{
        url: string;
        size: number;
        originalName: string;
    }>;
    remove(id: string): Promise<{
        path: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        originalName: string;
        fileName: string;
        size: number;
    }>;
}
