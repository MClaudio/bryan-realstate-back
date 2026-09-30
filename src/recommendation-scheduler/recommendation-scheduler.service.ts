import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationActionType } from '@prisma/client';
import { RecommendationRunnerService } from '../properties/recommendation-runner.service';
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
  aiCalls: number;
  errors: number;
}

@Injectable()
export class RecommendationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationSchedulerService.name);
  private readonly cronJobName = 'property-interests-recommender-sync';

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly recommendationRunner: RecommendationRunnerService,
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

    // Consulta ligera: antes se cargaban todas las propiedades con sus archivos y URLs firmadas.
    const propertyIds = onlyPropertyId
      ? [onlyPropertyId]
      : await this.recommendationRunner.findPropertyIdsToSync();

    const summary: SchedulerRunSummary = {
      total: propertyIds.length,
      processed: 0,
      candidatesTotal: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      aiCalls: 0,
      errors: 0,
    };

    const withNewRecommendations: SchedulerCreatedEntry[] = [];

    for (const propertyId of propertyIds) {
      try {
        // Same flow as saving and the manual button: a failed AI call never
        // touches the interested-clients list. If neither the property nor any
        // client changed since the last run, the AI is not called at all.
        const result = await this.recommendationRunner.run(propertyId, {
          trigger: 'scheduler',
        });
        if (result.status === 'skipped') {
          summary.skipped += 1;
          continue;
        }
        summary.aiCalls += result.aiCalls ?? 0;
        summary.candidatesTotal += result.candidates.length;

        if (result.status === 'failed') {
          summary.errors += 1;
          this.logger.warn(
            `Recommender sync skipped property ${result.propertyCode}: ${result.error}`,
          );
          continue;
        }

        summary.processed += 1;
        const s = result.summary;
        if (!s) continue;
        summary.created += s.created;
        summary.updated += s.updated;
        summary.deleted += s.deleted;

        if (s.created > 0) {
          withNewRecommendations.push({
            propertyId,
            propertyCode: result.propertyCode,
            advisorId: result.advisorId,
            created: s.created,
            updated: s.updated,
            deleted: s.deleted,
            newClientIds: [],
          });
        }
      } catch (err) {
        summary.errors += 1;
        this.logger.error(
          `Recommender sync failed for property ${propertyId}: ${
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
