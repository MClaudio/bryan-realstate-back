import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { Prisma } from '@prisma/client';
export declare class ProcessesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateProcessDto): Promise<{
        property: {
            address: string;
            id: string;
            code: string;
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
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: Prisma.JsonValue;
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
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: Prisma.JsonValue;
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
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: Prisma.JsonValue;
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
        type: import("@prisma/client").$Enums.ProcessType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        description: string;
        title: string;
        expenses: Prisma.JsonValue;
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
        expenses: Prisma.JsonValue;
        approximateTime: string | null;
        nextStep: string | null;
    }>;
}
