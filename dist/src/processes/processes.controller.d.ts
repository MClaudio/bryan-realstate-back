import { ProcessesService } from './processes.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
export declare class ProcessesController {
    private readonly processesService;
    constructor(processesService: ProcessesService);
    create(dto: CreateProcessDto): Promise<{
        property: {
            address: string;
            id: string;
            code: string;
        };
        files: ({
            file: {
                path: string;
                id: string;
                originalName: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    }>;
    findAllByProperty(propertyId: string): Promise<({
        property: {
            address: string;
            id: string;
            code: string;
        };
        files: ({
            file: {
                path: string;
                id: string;
                originalName: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    })[]>;
    findOne(id: string): Promise<{
        property: {
            address: string;
            id: string;
            code: string;
        };
        files: ({
            file: {
                path: string;
                id: string;
                originalName: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    }>;
    update(id: string, dto: UpdateProcessDto): Promise<{
        property: {
            address: string;
            id: string;
            code: string;
        };
        files: ({
            file: {
                path: string;
                id: string;
                originalName: string;
                size: number;
            };
        } & {
            createdAt: Date;
            fileId: string;
            processId: string;
        })[];
    } & {
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    }>;
    remove(id: string): Promise<{
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: import("@prisma/client/runtime/client").JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    }>;
}
