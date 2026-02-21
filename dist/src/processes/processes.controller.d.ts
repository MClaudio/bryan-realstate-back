import { ProcessesService } from './processes.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
export declare class ProcessesController {
    private readonly processesService;
    constructor(processesService: ProcessesService);
    create(dto: CreateProcessDto): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        files: ({
            file: {
                id: string;
                originalName: string;
                path: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.ProcessType;
        description: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
    }>;
    findAllByProperty(propertyId: string): Promise<({
        property: {
            id: string;
            code: string;
            address: string;
        };
        files: ({
            file: {
                id: string;
                originalName: string;
                path: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.ProcessType;
        description: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
    })[]>;
    findOne(id: string): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        files: ({
            file: {
                id: string;
                originalName: string;
                path: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.ProcessType;
        description: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
    }>;
    update(id: string, dto: UpdateProcessDto): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        files: ({
            file: {
                id: string;
                originalName: string;
                path: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.ProcessType;
        description: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        title: string;
        type: import("@prisma/client").$Enums.ProcessType;
        description: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
    }>;
}
