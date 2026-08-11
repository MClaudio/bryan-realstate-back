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
        client: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
        };
        property: {
            address: string;
            id: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    }>;
    findAllByProperty(propertyId: string): Promise<({
        client: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
        };
        property: {
            address: string;
            id: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    })[]>;
    findAllByClient(clientId: string): Promise<({
        client: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
        };
        property: {
            address: string;
            id: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    })[]>;
    findOne(id: string): Promise<{
        client: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
        };
        property: {
            address: string;
            id: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    }>;
    update(id: string, dto: UpdatePropertyInterestDto): Promise<{
        client: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
        };
        property: {
            address: string;
            id: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        clientId: string;
        propertyId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
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
            client: {
                firstName: string;
                lastName: string;
                email: string | null;
                phone: string;
                id: string;
            };
            property: {
                address: string;
                id: string;
                code: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            clientId: string;
            propertyId: string;
            interestDate: Date;
            interestLevel: import("@prisma/client").$Enums.InterestLevel;
        })[];
    }>;
}
