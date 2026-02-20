import { FilesService } from './files.service';
export declare class PublicFilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    redirectToUrl(id: string, req: any, res: any): Promise<any>;
}
