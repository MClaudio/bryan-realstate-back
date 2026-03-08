import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class PropertiesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createPropertyDto: CreatePropertyDto): Promise<{
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    }>;
    findAll(): Promise<({
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    })[]>;
    findFeatured(): Promise<({
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    })[]>;
    findOnePublic(id: string): Promise<{
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    }>;
    findOne(id: string): Promise<{
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    }>;
    update(id: string, updatePropertyDto: UpdatePropertyDto): Promise<{
        advisor: {
            firstName: string;
            lastName: string;
            id: string;
        };
        negotiationClient: {
            firstName: string;
            lastName: string;
            phone: string;
            id: string;
        } | null;
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        address: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        locationUrl: string;
        constructionArea: Prisma.Decimal;
        landArea: Prisma.Decimal;
        hasBasicServices: boolean;
        basicServices: Prisma.JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        advisorId: string;
        owner: string | null;
        price: Prisma.Decimal;
        maxPrice: Prisma.Decimal | null;
        minPrice: Prisma.Decimal;
        commission: Prisma.Decimal;
        salePrice: Prisma.Decimal | null;
        isPublic: boolean;
        isActive: boolean;
        isFeatured: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        negotiationClientId: string | null;
        deletedAt: Date | null;
    }>;
    resolveMapsUrl(url: string): Promise<{
        latitude: string;
        longitude: string;
        resolvedUrl: string;
    }>;
}
