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
    recommendForProperty(id: string): Promise<{
        propertyId: string;
        recommendationQueued: boolean;
        recommendedCandidates: import("./property-recommendation.service").RecommendedCandidate[];
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
        advisorId: string;
        owner: string | null;
        price: import("@prisma/client-runtime-utils").Decimal;
        maxPrice: import("@prisma/client-runtime-utils").Decimal | null;
        minPrice: import("@prisma/client-runtime-utils").Decimal;
        commission: import("@prisma/client-runtime-utils").Decimal;
        salePrice: import("@prisma/client-runtime-utils").Decimal | null;
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
}
