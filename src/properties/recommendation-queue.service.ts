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
import {
  RecommendationRunnerService,
  describeRecommendationRun,
} from './recommendation-runner.service';

type RecommendationJobTrigger = 'create' | 'update' | 'manual';

interface RecommendationJobData {
  propertyId: string;
  userId: string;
  trigger: RecommendationJobTrigger;
  /** Legacy jobs carried a property snapshot; it is ignored (the runner reloads it). */
  property?: unknown;
}

const PROPERTY_RECOMMENDATION_QUEUE = 'property-recommendation';
const PROPERTY_RECOMMENDATION_JOB = 'run';

/** Job states that mean "a recommendation is still going to run / running". */
const PENDING_STATES = ['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'] as const;
type PendingState = (typeof PENDING_STATES)[number];

@Injectable()
export class RecommendationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationQueueService.name);
  private queue!: Queue<RecommendationJobData>;
  private worker!: Worker<RecommendationJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly recommendationRunner: RecommendationRunnerService,
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

  /**
   * Manual run in the background. If a job for the same property is already
   * waiting or running (manual or triggered by a save), no new one is created.
   */
  async enqueueManualRecommendation(
    propertyId: string,
    userId: string,
  ): Promise<{ jobId: string; alreadyRunning: boolean }> {
    const pending = await this.findPendingJob(propertyId);
    if (pending) return { jobId: String(pending.id), alreadyRunning: true };

    // Fixed id so two simultaneous clicks can't create two jobs; a finished job
    // kept by removeOnComplete/removeOnFail would block the id, so drop it first.
    const jobId = `manual-${propertyId}`;
    const previous = await this.queue.getJob(jobId);
    if (previous) {
      const state = await previous.getState();
      if (PENDING_STATES.includes(state as PendingState)) {
        return { jobId, alreadyRunning: true };
      }
      await previous.remove();
    }

    await this.queue.add(
      PROPERTY_RECOMMENDATION_JOB,
      { propertyId, userId, trigger: 'manual' },
      { jobId },
    );
    return { jobId, alreadyRunning: false };
  }

  private async findPendingJob(
    propertyId: string,
  ): Promise<Job<RecommendationJobData> | undefined> {
    const jobs = await this.queue.getJobs([...PENDING_STATES]);
    return jobs.find((job) => job?.data?.propertyId === propertyId);
  }

  private async processRecommendationJob(
    job: Job<RecommendationJobData>,
  ): Promise<void> {
    const { propertyId, trigger, userId } = job.data;
    const result = await this.recommendationRunner.run(propertyId, { trigger });
    // Sin cambios no se llamó a la IA: no hace falta notificar.
    if (result.status === 'skipped') return;
    const { title, message } = describeRecommendationRun(result);

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
        status: result.status,
        candidates: result.candidates,
        reconcile: result.summary,
        error: result.error,
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
