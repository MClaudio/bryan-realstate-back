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
        ? NotificationActionType.OPEN_MODAL
        : NotificationActionType.NAVIGATE,
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
