import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    overview(): Promise<{
        counters: {
            users: number;
            clients: number;
            properties: number;
            publicProperties: number;
        };
        propertiesByStatus: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PropertyGroupByOutputType, "status"[]> & {
            _count: {
                id: number;
            };
        })[];
        priceAggregates: import("@prisma/client").Prisma.GetPropertyAggregateType<{
            _sum: {
                price: true;
                salePrice: true;
                commission: true;
            };
            _avg: {
                price: true;
                salePrice: true;
            };
        }>;
        latestProperties: ({
            advisor: {
                firstName: string;
                lastName: string;
                id: string;
            };
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
            isActive: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
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
            isFeatured: boolean;
            facebookUrl: string | null;
            tiktokUrl: string | null;
            instagramUrl: string | null;
            youtubeUrl: string | null;
            negotiationClientId: string | null;
            deletedAt: Date | null;
        })[];
    }>;
    propertyStats(): Promise<{
        byType: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PropertyGroupByOutputType, "propertyType"[]> & {
            _count: {
                id: number;
            };
        })[];
        byZone: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PropertyGroupByOutputType, "zone"[]> & {
            _count: {
                id: number;
            };
        })[];
        byTopography: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PropertyGroupByOutputType, "topography"[]> & {
            _count: {
                id: number;
            };
        })[];
        priceAggregates: import("@prisma/client").Prisma.GetPropertyAggregateType<{
            _min: {
                price: true;
                salePrice: true;
            };
            _max: {
                price: true;
                salePrice: true;
            };
            _avg: {
                price: true;
                salePrice: true;
            };
        }>;
    }>;
    fileStats(): Promise<{
        byType: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.PropertyFileGroupByOutputType, "fileType"[]> & {
            _count: {
                fileId: number;
            };
        })[];
        totalFiles: number;
    }>;
    recent(): Promise<{
        users: {
            firstName: string;
            lastName: string;
            username: string;
            email: string;
            type: import("@prisma/client").$Enums.UserType;
            id: string;
            createdAt: Date;
        }[];
        clients: {
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string;
            id: string;
            createdAt: Date;
        }[];
        properties: {
            address: string;
            id: string;
            createdAt: Date;
            code: string;
            status: import("@prisma/client").$Enums.PropertyStatus;
            price: import("@prisma/client-runtime-utils").Decimal;
            salePrice: import("@prisma/client-runtime-utils").Decimal | null;
        }[];
        files: {
            id: string;
            createdAt: Date;
            originalName: string;
            fileName: string;
            size: number;
        }[];
    }>;
}
