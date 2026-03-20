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
        notes: string | null;
        propertyId: string;
        clientId: string;
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
        propertyId: string;
        clientId: string;
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
        propertyId: string;
        clientId: string;
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
        propertyId: string;
        clientId: string;
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
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        propertyId: string;
        clientId: string;
        interestDate: Date;
        interestLevel: import("@prisma/client").$Enums.InterestLevel;
    }>;
}
