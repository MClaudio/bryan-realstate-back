import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ClientCriteriaService } from './client-criteria.service';
import { MatchEngineService } from './match-engine.service';
import { RecommendationNotifierService } from './recommendation-notifier.service';

export interface SyncSummary {
  extracted: number;
  byRules: number;
  byAi: number;
  aiCalls: number;
  clientsRecomputed: number;
  propertiesRecomputed: number;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
}

/**
 * Red de seguridad del motor de recomendaciones (los cambios normales los procesa la cola al
 * instante). Usa las marcas:
 * - cliente: huella del texto + versión del extractor → vuelve a leer criterios (IA solo si hace falta);
 * - criterios: huella de criterios + versión de reglas → recalcula sus propiedades;
 * - propiedad: huella de los datos del formulario + versión de reglas → recalcula sus clientes.
 * Cambiar el prompt, el parser o las reglas recalcula todo solo.
 */
@Injectable()
export class RecommendationsSchedulerService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RecommendationsSchedulerService.name);
  private readonly cronJobName = 'recommendations-sync';
  private running = false;
  private startupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly criteriaService: ClientCriteriaService,
    private readonly matchEngine: MatchEngineService,
    private readonly notifier: RecommendationNotifierService,
  ) {}

  onModuleInit(): void {
    if (
      this.configService.get<string>('RECOMMENDER_SYNC_ENABLED') === 'false'
    ) {
      this.logger.log(
        'Sincronización de recomendaciones desactivada (RECOMMENDER_SYNC_ENABLED=false)',
      );
      return;
    }
    const expression =
      String(
        this.configService.get<string>('RECOMMENDER_SYNC_CRON') || '',
      ).trim() || '0 */5 * * *';
    const timezone =
      String(
        this.configService.get<string>('RECOMMENDER_SYNC_TZ') || '',
      ).trim() ||
      String(
        this.configService.get<string>('TZ') || 'America/Guayaquil',
      ).trim();
    const job = new CronJob(
      expression,
      () => {
        this.runSync().catch((err: unknown) =>
          this.logger.error(
            `Sincronización de recomendaciones falló: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      },
      null,
      false,
      timezone,
    );
    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();
    this.logger.log(
      `Cron '${this.cronJobName}' iniciado con '${expression}' (TZ=${timezone})`,
    );
  }

  /**
   * Al arrancar (p. ej. tras un despliegue) se sincroniza una vez, sin esperar al próximo cron:
   * lee los criterios de clientes nuevos o cambiados y recalcula lo afectado. Si nada cambió no hace
   * nada. Se desactiva con RECOMMENDER_SYNC_ON_START=false.
   */
  onApplicationBootstrap(): void {
    if (
      this.configService.get<string>('RECOMMENDER_SYNC_ENABLED') === 'false' ||
      this.configService.get<string>('RECOMMENDER_SYNC_ON_START') === 'false'
    )
      return;
    const delayMs = Number(
      this.configService.get<string>('RECOMMENDER_SYNC_START_DELAY_MS') ||
        30_000,
    );
    this.startupTimer = setTimeout(() => {
      this.startupTimer = null;
      this.logger.log('Sincronización de recomendaciones al arrancar');
      this.runSync().catch((err: unknown) =>
        this.logger.error(
          `Sincronización al arrancar falló: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, delayMs);
  }

  onModuleDestroy(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  /**
   * Lanza la sincronización en segundo plano (puede tardar minutos con muchos clientes) y avisa
   * al usuario con una notificación al terminar.
   */
  startInBackground(userId: string | null): {
    started: boolean;
    alreadyRunning: boolean;
  } {
    if (this.running) return { started: false, alreadyRunning: true };
    void this.runSync()
      .then((summary) => this.notifier.notifySyncFinished(userId, summary))
      .catch((err: unknown) =>
        this.logger.error(
          `Sincronización manual falló: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    return { started: true, alreadyRunning: false };
  }

  async runSync(): Promise<SyncSummary> {
    const summary: SyncSummary = {
      extracted: 0,
      byRules: 0,
      byAi: 0,
      aiCalls: 0,
      clientsRecomputed: 0,
      propertiesRecomputed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    };
    if (this.running) {
      this.logger.warn('Sincronización ya en curso: se omite esta ejecución');
      return summary;
    }
    this.running = true;
    try {
      // 1. Criterios de clientes nuevos o cambiados (o leídos con otra versión del extractor).
      // Un fallo aquí no impide recalcular con los criterios que ya existen.
      try {
        const toExtract =
          await this.criteriaService.findClientsNeedingExtraction();
        this.logger.log(
          `Sincronización de recomendaciones: ${toExtract.length} cliente(s) por leer`,
        );
        if (toExtract.length > 0) {
          const extraction =
            await this.criteriaService.extractClients(toExtract);
          summary.extracted = extraction.extracted;
          summary.byRules = extraction.byRules;
          summary.byAi = extraction.byAi;
          summary.aiCalls = extraction.aiCalls;
          summary.errors += extraction.errors;
        }
      } catch (error) {
        summary.errors += 1;
        this.logger.error(
          `Leer criterios de clientes falló: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // 2. Propiedades con datos o reglas cambiadas: recalculan todos sus clientes.
      for (const propertyId of await this.matchEngine.findPropertiesToRecompute()) {
        try {
          const result = await this.matchEngine.recomputeProperty(propertyId);
          summary.propertiesRecomputed += 1;
          summary.created += result.created;
          summary.updated += result.updated;
          summary.deleted += result.deleted;
          await this.notifier.notifyPropertyRecompute(
            propertyId,
            result,
            'scheduler',
            null,
          );
        } catch (error) {
          summary.errors += 1;
          this.logger.error(
            `Recalcular propiedad ${propertyId} falló: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // 3. Clientes con criterios cambiados: recalculan todas sus propiedades.
      for (const clientId of await this.matchEngine.findClientsToRecompute()) {
        try {
          const result = await this.matchEngine.recomputeClient(clientId);
          summary.clientsRecomputed += 1;
          summary.created += result.created;
          summary.updated += result.updated;
          summary.deleted += result.deleted;
          await this.notifier.notifyNewAltoForClient(clientId, result.newAlto);
        } catch (error) {
          summary.errors += 1;
          this.logger.error(
            `Recalcular cliente ${clientId} falló: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      this.logger.log(
        `Sincronización de recomendaciones: ${JSON.stringify(summary)}`,
      );
      return summary;
    } finally {
      this.running = false;
    }
  }
}
