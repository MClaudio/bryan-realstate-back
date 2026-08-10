import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationActionType } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { NotificationsService } from '../notifications/notifications.service';
import { PropertyRecommendationService } from './property-recommendation.service';
import { PropertyInterestsService } from '../property-interests/property-interests.service';

type RecommendationJobTrigger = 'create' | 'update' | 'manual';

interface RecommendationJobData {
  propertyId: string;
  userId: string;
  trigger: RecommendationJobTrigger;
  property: unknown;
}

const PROPERTY_RECOMMENDATION_QUEUE = 'property-recommendation';
const PROPERTY_RECOMMENDATION_JOB = 'run';

@Injectable()
export class RecommendationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationQueueService.name);
  private queue!: Queue<RecommendationJobData>;
  private worker!: Worker<RecommendationJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly propertyRecommendationService: PropertyRecommendationService,
    private readonly notificationsService: NotificationsService,
    private readonly propertyInterestsService: PropertyInterestsService,
  ) {}

  onModuleInit(): void {
    const connection = this.getRedisConnection();

    this.queue = new Queue<RecommendationJobData>(PROPERTY_RECOMMENDATION_QUEUE, {
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

    this.worker = new Worker<RecommendationJobData>(
      PROPERTY_RECOMMENDATION_QUEUE,
      async (job) => this.processRecommendationJob(job),
      {
        connection,
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Recommendation job failed (id=${job?.id ?? 'unknown'}): ${err.message}`,
      );
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Recommendation job completed (id=${job.id})`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }

    if (this.queue) {
      await this.queue.close();
    }
  }

  async enqueueRecommendation(input: RecommendationJobData): Promise<string> {
    const job = await this.queue.add(PROPERTY_RECOMMENDATION_JOB, input);
    return String(job.id);
  }

  private async processRecommendationJob(
    job: Job<RecommendationJobData>,
  ): Promise<void> {
    const { property, propertyId, trigger, userId } = job.data;
    const candidates =
      await this.propertyRecommendationService.recommendCandidates(property);
    const propertyCode = String(
      (property as { code?: unknown } | null)?.code ?? propertyId,
    );

    let reconcileSummary: { created?: number; updated?: number; deleted?: number } | null = null;
    try {
      const reconcile = await this.propertyInterestsService.reconcileRecommendations(
        propertyId,
        candidates,
      );
      reconcileSummary = reconcile.summary ?? null;
    } catch (error) {
      this.logger.error(
        `Error persisting interests for property ${propertyCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const hasCandidates = candidates.length > 0;
    const appliedChanges =
      reconcileSummary &&
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
      actionType: NotificationActionType.NAVIGATE,
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

  private getRedisConnection(): RedisOptions {
    const host = this.configService.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = Number(this.configService.get<string>('REDIS_PORT') || '6379');
    const username = this.configService.get<string>('REDIS_USER') || undefined;
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    return {
      host,
      port,
      username,
      password,
      maxRetriesPerRequest: null,
    };
  }
}
