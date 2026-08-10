import { PropertyInterestsService } from './property-interests.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { ReconcileRecommendationsDto } from './dto/reconcile-recommendations.dto';
export declare class PropertyInterestsController {
    private readonly service;
    constructor(service: PropertyInterestsService);
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
    reconcileRecommendations(propertyId: string, dto: ReconcileRecommendationsDto): Promise<{
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
    findAll(propertyId?: string, clientId?: string): Promise<({
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
    })[]> | never[];
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
}
