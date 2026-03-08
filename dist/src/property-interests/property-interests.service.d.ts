import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
        notes: string | null;
    }>;
}
