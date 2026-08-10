import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
export declare class PropertiesController {
    private readonly propertiesService;
    constructor(propertiesService: PropertiesService);
    private getUserId;
    resolveMapsUrl(url: string): Promise<{
        latitude: string;
        longitude: string;
        resolvedUrl: string;
    }>;
    recommendForProperty(id: string, req: any, body?: {
        enqueue?: boolean;
        persist?: boolean;
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
    create(createPropertyDto: CreatePropertyDto, req: any): Promise<{
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
    })[]>;
    findAllPublic(): Promise<({
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
    })[]>;
    findCities(): Promise<{
        id: string;
        name: string;
    }[]>;
    getCurrentSequence(): Promise<{
        currentSequence: number;
    }>;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
    } & {
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
    }>;
    update(id: string, updatePropertyDto: UpdatePropertyDto, req: any): Promise<{
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
                id: string;
                createdAt: Date;
                updatedAt: Date;
                originalName: string;
                fileName: string;
                path: string;
                size: number;
                description: string | null;
            };
        } & {
            createdAt: Date;
            fileType: import("@prisma/client").$Enums.FileType;
            sortOrder: number;
            fileId: string;
            propertyId: string;
        })[];
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        code: string;
        address: string;
        referenceSector: string | null;
        locationUrl: string;
        constructionArea: import("@prisma/client-runtime-utils").Decimal;
        landArea: import("@prisma/client-runtime-utils").Decimal;
        hasBasicServices: boolean;
        basicServices: import("@prisma/client/runtime/client").JsonValue;
        features: string | null;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        constructionYears: number | null;
        latitude: import("@prisma/client-runtime-utils").Decimal;
        longitude: import("@prisma/client-runtime-utils").Decimal;
        topography: import("@prisma/client").$Enums.Topography;
        zone: import("@prisma/client").$Enums.Zone;
        cityTime: number | null;
        observations: string | null;
        status: import("@prisma/client").$Enums.PropertyStatus;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        isPublic: boolean;
        facebookUrl: string | null;
        tiktokUrl: string | null;
        instagramUrl: string | null;
        youtubeUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        isActive: boolean;
        isFeatured: boolean;
        cityId: string | null;
        advisorId: string;
        negotiationClientId: string | null;
    }>;
}
