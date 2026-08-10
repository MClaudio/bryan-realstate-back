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
const property_interests_service_1 = require("../property-interests/property-interests.service");
const PROPERTY_RECOMMENDATION_QUEUE = 'property-recommendation';
const PROPERTY_RECOMMENDATION_JOB = 'run';
let RecommendationQueueService = RecommendationQueueService_1 = class RecommendationQueueService {
    configService;
    propertyRecommendationService;
    notificationsService;
    propertyInterestsService;
    logger = new common_1.Logger(RecommendationQueueService_1.name);
    queue;
    worker;
    constructor(configService, propertyRecommendationService, notificationsService, propertyInterestsService) {
        this.configService = configService;
        this.propertyRecommendationService = propertyRecommendationService;
        this.notificationsService = notificationsService;
        this.propertyInterestsService = propertyInterestsService;
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
        let reconcileSummary = null;
        try {
            const reconcile = await this.propertyInterestsService.reconcileRecommendations(propertyId, candidates);
            reconcileSummary = reconcile.summary ?? null;
        }
        catch (error) {
            this.logger.error(`Error persisting interests for property ${propertyCode}: ${error instanceof Error ? error.message : String(error)}`);
        }
        const hasCandidates = candidates.length > 0;
        const appliedChanges = reconcileSummary &&
            (reconcileSummary.created ||
                reconcileSummary.updated ||
                reconcileSummary.deleted);
        const reconcileText = reconcileSummary
            ? ` (${reconcileSummary.created ?? 0} nuevo(s), ${reconcileSummary.updated ?? 0} actualizado(s), ${reconcileSummary.deleted ?? 0} removido(s))`
            : '';
        const title = appliedChanges
            ? 'Recomendación IA aplicada'
            : hasCandidates
                ? 'Recomendación IA finalizada'
                : 'Recomendación IA finalizada';
        const message = appliedChanges
            ? `Se aplicaron automáticamente los interesados para la propiedad ${propertyCode}.${reconcileText}`
            : hasCandidates
                ? `Se encontraron ${candidates.length} cliente(s) para la propiedad ${propertyCode} y se actualizó la lista de interesados.`
                : `No se encontraron clientes nuevos para la propiedad ${propertyCode}.${reconcileText}`;
        await this.notificationsService.createForUser({
            userId,
            title,
            message,
            path: `/admin/propiedades/ver/${propertyId}`,
            actionType: client_1.NotificationActionType.NAVIGATE,
            entityType: 'property',
            entityId: propertyId,
            payload: {
                propertyId,
                trigger,
                candidates,
                reconcile: reconcileSummary,
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
        notifications_service_1.NotificationsService,
        property_interests_service_1.PropertyInterestsService])
], RecommendationQueueService);
//# sourceMappingURL=recommendation-queue.service.js.map