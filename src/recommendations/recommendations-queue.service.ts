import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { ClientCriteriaService } from './client-criteria.service';
import { MatchEngineService } from './match-engine.service';
import { RecommendationNotifierService } from './recommendation-notifier.service';

type RecommendationJob =
  | { kind: 'client'; clientId: string }
  | {
      kind: 'property';
      propertyId: string;
      userId?: string | null;
      trigger: 'create' | 'update' | 'manual';
    };

const QUEUE_NAME = 'recommendations';
const PENDING_STATES = [
  'waiting',
  'delayed',
  'prioritized',
  'waiting-children',
] as const;

/**
 * Trabajos en segundo plano del motor de recomendaciones:
 * - client: el interés cambió → leer criterios (reglas / IA) y recalcular sus propiedades.
 * - property: la propiedad cambió → recalcular sus clientes (sin IA).
 */
@Injectable()
export class RecommendationsQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecommendationsQueueService.name);
  private queue!: Queue<RecommendationJob>;
  private worker!: Worker<RecommendationJob>;

  constructor(
    private readonly configService: ConfigService,
    private readonly criteriaService: ClientCriteriaService,
    private readonly matchEngine: MatchEngineService,
    private readonly notifier: RecommendationNotifierService,
  ) {}

  onModuleInit(): void {
    const connection = this.getRedisConnection();
    this.queue = new Queue<RecommendationJob>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 200,
      },
    });
    this.worker = new Worker<RecommendationJob>(
      QUEUE_NAME,
      (job) => this.process(job),
      {
        connection,
        concurrency: 2,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(
        `Trabajo de recomendaciones falló (${job?.id ?? '?'}): ${err.message}`,
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** El cliente cambió su interés (o se creó). */
  enqueueClient(clientId: string): Promise<void> {
    return this.add(`client-${clientId}`, { kind: 'client', clientId });
  }

  /** La propiedad se creó, cambió o cambió de estado. */
  enqueueProperty(
    propertyId: string,
    trigger: 'create' | 'update' | 'manual',
    userId?: string | null,
  ): Promise<void> {
    return this.add(`property-${propertyId}`, {
      kind: 'property',
      propertyId,
      trigger,
      userId,
    });
  }

  /**
   * Un trabajo por cliente/propiedad: si ya hay uno esperando no se duplica; si uno está corriendo,
   * se agrega otro para no perder el último cambio.
   */
  private async add(jobId: string, data: RecommendationJob): Promise<void> {
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if ((PENDING_STATES as readonly string[]).includes(state)) return;
        if (state === 'active') {
          await this.queue.add(data.kind, data, {
            jobId: `${jobId}-${Date.now()}`,
          });
          return;
        }
        await existing.remove();
      }
      await this.queue.add(data.kind, data, { jobId });
    } catch (error) {
      // Sin Redis no se pierde nada: el cron detecta el cambio por las huellas y lo recalcula.
      this.logger.warn(
        `No se pudo encolar ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async process(job: Job<RecommendationJob>): Promise<void> {
    const data = job.data;
    if (data.kind === 'client') {
      await this.criteriaService.extractClients([data.clientId]);
      const summary = await this.matchEngine.recomputeClient(data.clientId);
      await this.notifier.notifyNewAltoForClient(
        data.clientId,
        summary.newAlto,
      );
      return;
    }
    const summary = await this.matchEngine.recomputeProperty(data.propertyId, {
      onlyIfChanged: data.trigger === 'update',
    });
    await this.notifier.notifyPropertyRecompute(
      data.propertyId,
      summary,
      data.trigger,
      data.userId ?? null,
    );
  }

  private getRedisConnection(): RedisOptions {
    return {
      host: this.configService.get<string>('REDIS_HOST') || '127.0.0.1',
      port: Number(this.configService.get<string>('REDIS_PORT') || '6379'),
      username: this.configService.get<string>('REDIS_USER') || undefined,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
