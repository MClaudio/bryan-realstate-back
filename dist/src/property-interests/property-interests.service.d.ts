import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { InterestLevel } from '@prisma/client';
export interface RecommendedClientInterest {
    clientId: string;
    interestLevel: InterestLevel;
    interestDate?: string;
    notes?: string;
}
export declare class PropertyInterestsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreatePropertyInterestDto): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        client: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
        };
    } & {
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    }>;
    findAllByProperty(propertyId: string): Promise<({
        property: {
            id: string;
            code: string;
            address: string;
        };
        client: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
        };
    } & {
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    })[]>;
    findAllByClient(clientId: string): Promise<({
        property: {
            id: string;
            code: string;
            address: string;
        };
        client: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
        };
    } & {
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    })[]>;
    findOne(id: string): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        client: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
        };
    } & {
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    }>;
    update(id: string, dto: UpdatePropertyInterestDto): Promise<{
        property: {
            id: string;
            code: string;
            address: string;
        };
        client: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
        };
    } & {
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
    }>;
    reconcileRecommendations(propertyId: string, recommendations: Array<{
        client_id?: string;
        clientId?: string;
        interest_level?: unknown;
        interestLevel?: unknown;
        reason?: string;
        notes?: string;
        interestDate?: string;
    }>): Promise<{
        propertyId: string;
        summary: {
            totalIncoming: number;
            created: number;
            updated: number;
            deleted: number;
        };
        clientChanges: {
            created: string[];
            updated: string[];
            deleted: string[];
        };
        interests: ({
            property: {
                id: string;
                code: string;
                address: string;
            };
            client: {
                id: string;
                firstName: string;
                lastName: string;
                email: string | null;
                phone: string;
            };
        } & {
            id: string;
            interestDate: Date;
            interestLevel: import("@prisma/client").$Enums.InterestLevel;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            propertyId: string;
            clientId: string;
        })[];
    }>;
}
