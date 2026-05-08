"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RecommendationQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationQueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const notifications_service_1 = require("../notifications/notifications.service");
const property_recommendation_service_1 = require("./property-recommendation.service");
const PROPERTY_RECOMMENDATION_QUEUE = 'property-recommendation';
const PROPERTY_RECOMMENDATION_JOB = 'run';
let RecommendationQueueService = RecommendationQueueService_1 = class RecommendationQueueService {
    configService;
    propertyRecommendationService;
    notificationsService;
    logger = new common_1.Logger(RecommendationQueueService_1.name);
    queue;
    worker;
    constructor(configService, propertyRecommendationService, notificationsService) {
        this.configService = configService;
        this.propertyRecommendationService = propertyRecommendationService;
        this.notificationsService = notificationsService;
    }
    onModuleInit() {
        const connection = this.getRedisConnection();
        this.queue = new bullmq_1.Queue(PROPERTY_RECOMMENDATION_QUEUE, {
            connection,
            defaultJobOptions: {
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 1500,
                },
                removeOnComplete: 200,
                removeOnFail: 200,
            },
        });
        this.worker = new bullmq_1.Worker(PROPERTY_RECOMMENDATION_QUEUE, async (job) => this.processRecommendationJob(job), {
            connection,
            concurrency: 2,
        });
        this.worker.on('failed', (job, err) => {
            this.logger.error(`Recommendation job failed (id=${job?.id ?? 'unknown'}): ${err.message}`);
        });
        this.worker.on('completed', (job) => {
            this.logger.log(`Recommendation job completed (id=${job.id})`);
        });
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.queue) {
            await this.queue.close();
        }
    }
    async enqueueRecommendation(input) {
        const job = await this.queue.add(PROPERTY_RECOMMENDATION_JOB, input);
        return String(job.id);
    }
    async processRecommendationJob(job) {
        const { property, propertyId, trigger, userId } = job.data;
        const candidates = await this.propertyRecommendationService.recommendCandidates(property);
        const propertyCode = String(property?.code ?? propertyId);
        const hasCandidates = candidates.length > 0;
        await this.notificationsService.createForUser({
            userId,
            title: hasCandidates
                ? 'Recomendación IA lista'
                : 'Recomendación IA finalizada',
            message: hasCandidates
                ? `Se encontraron ${candidates.length} cliente(s) para la propiedad ${propertyCode}.`
                : `No se encontraron clientes para la propiedad ${propertyCode}.`,
            path: `/admin/propiedades/ver/${propertyId}`,
            actionType: hasCandidates
                ? client_1.NotificationActionType.OPEN_MODAL
                : client_1.NotificationActionType.NAVIGATE,
            modalKey: hasCandidates ? 'property-interested-candidates' : undefined,
            entityType: 'property',
            entityId: propertyId,
            payload: {
                propertyId,
                trigger,
                candidates,
            },
        });
    }
    getRedisConnection() {
        const host = this.configService.get('REDIS_HOST') || '127.0.0.1';
        const port = Number(this.configService.get('REDIS_PORT') || '6379');
        const username = this.configService.get('REDIS_USER') || undefined;
        const password = this.configService.get('REDIS_PASSWORD') || undefined;
        return {
            host,
            port,
            username,
            password,
            maxRetriesPerRequest: null,
        };
    }
};
exports.RecommendationQueueService = RecommendationQueueService;
exports.RecommendationQueueService = RecommendationQueueService = RecommendationQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        property_recommendation_service_1.PropertyRecommendationService,
        notifications_service_1.NotificationsService])
], RecommendationQueueService);
//# sourceMappingURL=recommendation-queue.service.js.map