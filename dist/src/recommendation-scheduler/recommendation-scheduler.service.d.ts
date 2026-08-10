import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PropertiesService } from '../properties/properties.service';
import { PropertyRecommendationService } from '../properties/property-recommendation.service';
import { PropertyInterestsService } from '../property-interests/property-interests.service';
import { NotificationsService } from '../notifications/notifications.service';
interface SchedulerCreatedEntry {
    propertyId: string;
    propertyCode: string;
    advisorId: string | null;
    created: number;
    updated: number;
    deleted: number;
    newClientIds: string[];
}
interface SchedulerRunSummary {
    total: number;
    processed: number;
    candidatesTotal: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
}
export declare class RecommendationSchedulerService implements OnModuleInit {
    private readonly configService;
    private readonly schedulerRegistry;
    private readonly propertiesService;
    private readonly propertyRecommendationService;
    private readonly propertyInterestsService;
    private readonly notificationsService;
    private readonly logger;
    private readonly cronJobName;
    constructor(configService: ConfigService, schedulerRegistry: SchedulerRegistry, propertiesService: PropertiesService, propertyRecommendationService: PropertyRecommendationService, propertyInterestsService: PropertyInterestsService, notificationsService: NotificationsService);
    onModuleInit(): void;
    runSync(options?: {
        propertyId?: string | null;
    }): Promise<{
        summary: SchedulerRunSummary;
        propertiesWithNewRecommendations: SchedulerCreatedEntry[];
    }>;
}
export {};
