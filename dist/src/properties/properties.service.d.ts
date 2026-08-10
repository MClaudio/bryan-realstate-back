import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RecommendationQueueService } from './recommendation-queue.service';
import { PropertyRecommendationService } from './property-recommendation.service';
import { PropertyInterestsService } from '../property-interests/property-interests.service';
export declare class PropertiesService {
    private prisma;
    private readonly recommendationQueueService;
    private readonly propertyRecommendationService;
    private readonly propertyInterestsService;
    constructor(prisma: PrismaService, recommendationQueueService: RecommendationQueueService, propertyRecommendationService: PropertyRecommendationService, propertyInterestsService: PropertyInterestsService);
    getCurrentSequence(): Promise<{
        currentSequence: number;
    }>;
    findCities(): Promise<{
        name: string;
        id: string;
    }[]>;
    create(createPropertyDto: CreatePropertyDto, userId: string): Promise<{
        recommendationQueued: boolean;
        recommendationJobId: string;
        recommendedCandidates: never[];
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    }>;
    findAll(): Promise<({
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    })[]>;
    findFeatured(): Promise<({
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    })[]>;
    findOnePublic(id: string): Promise<{
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    }>;
    findOne(id: string): Promise<{
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    }>;
    recommendForProperty(id: string, options?: {
        persist?: boolean;
        enqueue?: boolean;
        userId?: string;
    }): Promise<{
        propertyId: string;
        recommendationQueued: boolean;
        recommendationJobId: string;
        recommendedCandidates: never[];
        reconcile?: undefined;
    } | {
        propertyId: string;
        recommendationQueued: boolean;
        recommendedCandidates: import("./property-recommendation.service").RecommendedCandidate[];
        reconcile: any;
        recommendationJobId?: undefined;
    }>;
    update(id: string, updatePropertyDto: UpdatePropertyDto, userId: string): Promise<{
        recommendationQueued: boolean;
        recommendationJobId: string;
        recommendedCandidates: never[];
        city: {
            name: string;
            id: string;
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
            propertyId: string;
            createdAt: Date;
            sortOrder: number;
            fileType: import("@prisma/client").$Enums.FileType;
            fileId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        advisorId: string;
        negotiationClientId: string | null;
        cityId: string | null;
        code: string;
        address: string;
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
        deletedAt: Date | null;
    }>;
    resolveMapsUrl(url: string): Promise<{
        latitude: string;
        longitude: string;
        resolvedUrl: string;
    }>;
}
