import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RecommendationQueueService } from './recommendation-queue.service';
import { PropertyRecommendationService } from './property-recommendation.service';
export declare class PropertiesService {
    private prisma;
    private readonly recommendationQueueService;
    private readonly propertyRecommendationService;
    constructor(prisma: PrismaService, recommendationQueueService: RecommendationQueueService, propertyRecommendationService: PropertyRecommendationService);
    getCurrentSequence(): Promise<{
        currentSequence: number;
    }>;
    findCities(): Promise<{
        id: string;
        name: string;
    }[]>;
    create(createPropertyDto: CreatePropertyDto, userId: string): Promise<{
        recommendationQueued: boolean;
        recommendationJobId: string;
        recommendedCandidates: never[];
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findAll(): Promise<({
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    })[]>;
    findFeatured(): Promise<({
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    })[]>;
    findOnePublic(id: string): Promise<{
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findOne(id: string): Promise<{
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    recommendForProperty(id: string): Promise<{
        propertyId: string;
        recommendationQueued: boolean;
        recommendedCandidates: import("./property-recommendation.service").RecommendedCandidate[];
    }>;
    update(id: string, updatePropertyDto: UpdatePropertyDto, userId: string): Promise<{
        recommendationQueued: boolean;
        recommendationJobId: string;
        recommendedCandidates: never[];
        city: {
            id: string;
            name: string;
        } | null;
        advisor: {
            id: string;
            firstName: string;
            lastName: string;
        };
        negotiationClient: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string;
        } | null;
        files: ({
            file: {
                createdAt: Date;
                id: string;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
            propertyId: string;
        })[];
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        code: string;
        address: string;
        cityId: string | null;
        referenceSector: string | null;
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    resolveMapsUrl(url: string): Promise<{
        latitude: string;
        longitude: string;
        resolvedUrl: string;
    }>;
}
