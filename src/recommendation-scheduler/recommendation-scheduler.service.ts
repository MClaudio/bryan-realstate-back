import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationActionType, PropertyStatus } from '@prisma/client';
import { PropertiesService } from '../properties/properties.service';
import { PropertyRecommendationService } from '../properties/property-recommendation.service';
import { PropertyInterestsService } from '../property-interests/property-interests.service';
import { NotificationsService } from '../notifications/notifications.service';

interface PropertyWithAdvisor {
  id: string;
  code?: unknown;
  status?: unknown;
  advisor?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

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

@Injectable()
export class RecommendationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationSchedulerService.name);
  private readonly cronJobName = 'property-interests-recommender-sync';

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly propertiesService: PropertiesService,
    private readonly propertyRecommendationService: PropertyRecommendationService,
    private readonly propertyInterestsService: PropertyInterestsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    const expression =
      String(this.configService.get<string>('RECOMMENDER_SYNC_CRON') || '').trim() ||
      '0 */5 * * *';
    const timezone =
      String(this.configService.get<string>('RECOMMENDER_SYNC_TZ') || '').trim() ||
      String(this.configService.get<string>('TZ') || 'America/Guayaquil').trim();

    if (this.configService.get<string>('RECOMMENDER_SYNC_ENABLED') === 'false') {
      this.logger.log('Recommender scheduler disabled via RECOMMENDER_SYNC_ENABLED=false');
      return;
    }

    const job = new CronJob(
      expression,
      () => {
        this.runSync()
          .catch((err) =>
            this.logger.error(`Scheduled recommender sync failed: ${err.message || String(err)}`),
          );
      },
      null,
      false,
      timezone,
    );

    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();

    this.logger.log(
      `Cron job '${this.cronJobName}' started with expression '${expression}' (TZ=${timezone})`,
    );
  }

  async runSync(options?: { propertyId?: string | null }) {
    const onlyPropertyId = options?.propertyId ?? null;

    const properties: PropertyWithAdvisor[] = onlyPropertyId
      ? [await this.propertiesService.findOne(onlyPropertyId)]
      : await this.propertiesService.findAll();

    const summary: SchedulerRunSummary = {
      total: properties.length,
      processed: 0,
      candidatesTotal: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
    };

    const withNewRecommendations: SchedulerCreatedEntry[] = [];

    for (const property of properties) {
      try {
        if (property.status !== PropertyStatus.Nuevo) {
          summary.skipped += 1;
          continue;
        }

        const candidates = await this.propertyRecommendationService.recommendCandidates(property);
        summary.candidatesTotal += candidates.length;

        const result = await this.propertyInterestsService.reconcileRecommendations(
          property.id,
          candidates,
        );
        summary.created += result.summary.created;
        summary.updated += result.summary.updated;
        summary.deleted += result.summary.deleted;
        summary.processed += 1;

        if (result.summary.created > 0) {
          const propertyCode = String(property.code ?? property.id);
          const advisorId = property.advisor?.id ?? null;
          const newClientIds =
            (result.clientChanges?.created ?? []).map((c: any) => c?.clientId).filter(Boolean) as string[];

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
      } catch (err) {
        summary.errors += 1;
        this.logger.error(
          `Recommender sync failed for property ${property.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (withNewRecommendations.length > 0) {
      this.logger.log(
        `Recommender sync finished with new recommendations in ${withNewRecommendations.length} property(ies).`,
      );
      for (const entry of withNewRecommendations) {
        if (!entry.advisorId) continue;
        try {
          const clientsText =
            entry.created === 1
              ? `${entry.created} nuevo cliente interesado`
              : `${entry.created} nuevos clientes interesados`;
          const message =
            `Sincronización IA cada 5h: se agregó ${clientsText} a la propiedad ${entry.propertyCode}.` +
            (entry.updated || entry.deleted
              ? ` (adicionales: ${entry.updated} actualizado(s), ${entry.deleted} removido(s))`
              : '');

          await this.notificationsService.createForUser({
            userId: entry.advisorId,
            title: 'Nueva recomendación IA (sincronización 5h)',
            message,
            path: `/admin/propiedades/ver/${entry.propertyId}`,
            actionType: NotificationActionType.NAVIGATE,
            entityType: 'property',
            entityId: entry.propertyId,
            payload: {
              trigger: 'scheduler-5h',
              schedulerSummary: summary,
              propertySummary: entry,
            },
          });
        } catch (notificationError) {
          this.logger.error(
            `Failed to notify scheduler result for advisor ${entry.advisorId} / property ${entry.propertyId}: ${
              notificationError instanceof Error ? notificationError.message : String(notificationError)
            }`,
          );
        }
      }
    } else {
      this.logger.log(
        `Recommender sync finished. No new recommendations were added in any property.`,
      );
    }

    this.logger.log(`Recommender sync completed: ${JSON.stringify(summary)}`);
    return { summary, propertiesWithNewRecommendations: withNewRecommendations };
  }
}
