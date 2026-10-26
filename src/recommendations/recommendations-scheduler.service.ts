import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class RecommendationsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationsSchedulerService.name);
  private readonly cronJobName = 'recommendations-sync';
  private running = false;

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
      const toExtract =
        await this.criteriaService.findClientsNeedingExtraction();
      if (toExtract.length > 0) {
        const extraction = await this.criteriaService.extractClients(toExtract);
        summary.extracted = extraction.extracted;
        summary.byRules = extraction.byRules;
        summary.byAi = extraction.byAi;
        summary.aiCalls = extraction.aiCalls;
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
