import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { PropertyRecommendationService } from './property-recommendation.service';
type RecommendationJobTrigger = 'create' | 'update' | 'manual';
interface RecommendationJobData {
    propertyId: string;
    userId: string;
    trigger: RecommendationJobTrigger;
    property: unknown;
}
export declare class RecommendationQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly propertyRecommendationService;
    private readonly notificationsService;
    private readonly logger;
    private queue;
    private worker;
    constructor(configService: ConfigService, propertyRecommendationService: PropertyRecommendationService, notificationsService: NotificationsService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    enqueueRecommendation(input: RecommendationJobData): Promise<string>;
    private processRecommendationJob;
    private getRedisConnection;
}
export {};
