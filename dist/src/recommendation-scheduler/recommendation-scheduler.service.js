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
var RecommendationSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const client_1 = require("@prisma/client");
const properties_service_1 = require("../properties/properties.service");
const property_recommendation_service_1 = require("../properties/property-recommendation.service");
const property_interests_service_1 = require("../property-interests/property-interests.service");
const notifications_service_1 = require("../notifications/notifications.service");
let RecommendationSchedulerService = RecommendationSchedulerService_1 = class RecommendationSchedulerService {
    configService;
    schedulerRegistry;
    propertiesService;
    propertyRecommendationService;
    propertyInterestsService;
    notificationsService;
    logger = new common_1.Logger(RecommendationSchedulerService_1.name);
    cronJobName = 'property-interests-recommender-sync';
    constructor(configService, schedulerRegistry, propertiesService, propertyRecommendationService, propertyInterestsService, notificationsService) {
        this.configService = configService;
        this.schedulerRegistry = schedulerRegistry;
        this.propertiesService = propertiesService;
        this.propertyRecommendationService = propertyRecommendationService;
        this.propertyInterestsService = propertyInterestsService;
        this.notificationsService = notificationsService;
    }
    onModuleInit() {
        const expression = String(this.configService.get('RECOMMENDER_SYNC_CRON') || '').trim() ||
            '0 */5 * * *';
        const timezone = String(this.configService.get('RECOMMENDER_SYNC_TZ') || '').trim() ||
            String(this.configService.get('TZ') || 'America/Guayaquil').trim();
        if (this.configService.get('RECOMMENDER_SYNC_ENABLED') === 'false') {
            this.logger.log('Recommender scheduler disabled via RECOMMENDER_SYNC_ENABLED=false');
            return;
        }
        const job = new cron_1.CronJob(expression, () => {
            this.runSync()
                .catch((err) => this.logger.error(`Scheduled recommender sync failed: ${err.message || String(err)}`));
        }, null, false, timezone);
        this.schedulerRegistry.addCronJob(this.cronJobName, job);
        job.start();
        this.logger.log(`Cron job '${this.cronJobName}' started with expression '${expression}' (TZ=${timezone})`);
    }
    async runSync(options) {
        const onlyPropertyId = options?.propertyId ?? null;
        const properties = onlyPropertyId
            ? [await this.propertiesService.findOne(onlyPropertyId)]
            : await this.propertiesService.findAll();
        const summary = {
            total: properties.length,
            processed: 0,
            candidatesTotal: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: 0,
        };
        const withNewRecommendations = [];
        for (const property of properties) {
            try {
                if (property.status !== client_1.PropertyStatus.Nuevo) {
                    summary.skipped += 1;
                    continue;
                }
                const candidates = await this.propertyRecommendationService.recommendCandidates(property);
                summary.candidatesTotal += candidates.length;
                const result = await this.propertyInterestsService.reconcileRecommendations(property.id, candidates);
                summary.created += result.summary.created;
                summary.updated += result.summary.updated;
                summary.deleted += result.summary.deleted;
                summary.processed += 1;
                if (result.summary.created > 0) {
                    const propertyCode = String(property.code ?? property.id);
                    const advisorId = property.advisor?.id ?? null;
                    const newClientIds = (result.clientChanges?.created ?? []).map((c) => c?.clientId).filter(Boolean);
                    withNewRecommendations.push({
                        propertyId: property.id,
                        propertyCode,
                        advisorId,
                        created: result.summary.created,
                        updated: result.summary.updated ?? 0,
                        deleted: result.summary.deleted ?? 0,
                        newClientIds,
                    });
                }
            }
            catch (err) {
                summary.errors += 1;
                this.logger.error(`Recommender sync failed for property ${property.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        if (withNewRecommendations.length > 0) {
            this.logger.log(`Recommender sync finished with new recommendations in ${withNewRecommendations.length} property(ies).`);
            for (const entry of withNewRecommendations) {
                if (!entry.advisorId)
                    continue;
                try {
                    const clientsText = entry.created === 1
                        ? `${entry.created} nuevo cliente interesado`
                        : `${entry.created} nuevos clientes interesados`;
                    const message = `Sincronización IA cada 5h: se agregó ${clientsText} a la propiedad ${entry.propertyCode}.` +
                        (entry.updated || entry.deleted
                            ? ` (adicionales: ${entry.updated} actualizado(s), ${entry.deleted} removido(s))`
                            : '');
                    await this.notificationsService.createForUser({
                        userId: entry.advisorId,
                        title: 'Nueva recomendación IA (sincronización 5h)',
                        message,
                        path: `/admin/propiedades/ver/${entry.propertyId}`,
                        actionType: client_1.NotificationActionType.NAVIGATE,
                        entityType: 'property',
                        entityId: entry.propertyId,
                        payload: {
                            trigger: 'scheduler-5h',
                            schedulerSummary: summary,
                            propertySummary: entry,
                        },
                    });
                }
                catch (notificationError) {
                    this.logger.error(`Failed to notify scheduler result for advisor ${entry.advisorId} / property ${entry.propertyId}: ${notificationError instanceof Error ? notificationError.message : String(notificationError)}`);
                }
            }
        }
        else {
            this.logger.log(`Recommender sync finished. No new recommendations were added in any property.`);
        }
        this.logger.log(`Recommender sync completed: ${JSON.stringify(summary)}`);
        return { summary, propertiesWithNewRecommendations: withNewRecommendations };
    }
};
exports.RecommendationSchedulerService = RecommendationSchedulerService;
exports.RecommendationSchedulerService = RecommendationSchedulerService = RecommendationSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        schedule_1.SchedulerRegistry,
        properties_service_1.PropertiesService,
        property_recommendation_service_1.PropertyRecommendationService,
        property_interests_service_1.PropertyInterestsService,
        notifications_service_1.NotificationsService])
], RecommendationSchedulerService);
//# sourceMappingURL=recommendation-scheduler.service.js.map