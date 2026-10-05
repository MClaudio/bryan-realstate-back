import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyInterestsService } from '../property-interests/property-interests.service';
import { RecommendationFeedbackService } from '../property-interests/recommendation-feedback.service';
import {
  PropertyRecommendationService,
  RecommendedCandidate,
  describeRecommenderFailure,
} from './property-recommendation.service';
import { propertyInclude } from './property-include';
import {
  buildRecommendationClient,
  buildRecommendationProperty,
  computeRecommendationHash,
  hasRecommendationText,
} from './recommendation-payload';
import { InterestSource, PropertyStatus } from '@prisma/client';

export type RecommendationTrigger =
  | 'create'
  | 'update'
  | 'manual'
  | 'scheduler'
  | 'restore';

export type RecommendationStatus =
  | 'applied' // the interested-clients list changed
  | 'no_changes' // candidates found, list already matched them
  | 'no_candidates' // the AI answered but recommended nobody
  | 'preview' // candidates returned without touching the list
  | 'skipped' // nothing changed since the last run: the AI was NOT called
  | 'failed'; // AI call or saving failed; the list was NOT touched

/**
 * full  = la propiedad cambió (o ejecución manual): se evalúa contra todos los clientes.
 * delta = la propiedad no cambió: solo clientes nuevos o con intereses modificados.
 */
export type RecommendationMode = 'full' | 'delta';

export interface RecommendationRunResult {
  propertyId: string;
  propertyCode: string;
  advisorId: string | null;
  trigger: RecommendationTrigger;
  status: RecommendationStatus;
  candidates: RecommendedCandidate[];
  summary: {
    created: number;
    updated: number;
    deleted: number;
    discarded: number;
  } | null;
  error: string | null;
  mode?: RecommendationMode;
  /** Clientes enviados a la IA y llamadas realizadas (0 cuando se omite). */
  clientsEvaluated?: number;
  aiCalls?: number;
}

/**
 * The one recommendation flow shared by the save-triggered queue job, the
 * "Ejecutar recomendación IA" button and the 5-hour scheduler, so all three
 * build the same payload and treat failures the same way.
 *
 * To save tokens the AI only runs when something changed: a fingerprint of the
 * property data sent to the AI (`recommendationHash`) and the clients whose
 * interests changed after the last successful run (`interestUpdatedAt`).
 */
@Injectable()
export class RecommendationRunnerService {
  private readonly logger = new Logger(RecommendationRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommender: PropertyRecommendationService,
    private readonly propertyInterestsService: PropertyInterestsService,
    private readonly feedbackService: RecommendationFeedbackService,
  ) {}

  private async loadProperty(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      include: propertyInclude,
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    return property;
  }

  /** Propiedades que el cron debe revisar (consulta ligera, sin archivos ni URLs firmadas). */
  async findPropertyIdsToSync(): Promise<string[]> {
    const rows = await this.prisma.property.findMany({
      where: { status: PropertyStatus.Nuevo, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.id);
  }

  /** Huella actual de los datos de la propiedad que usa la IA. */
  computeHash(
    property: Parameters<typeof buildRecommendationProperty>[0],
  ): string {
    return computeRecommendationHash(buildRecommendationProperty(property));
  }

  async run(
    propertyId: string,
    options: {
      trigger: RecommendationTrigger;
      persist?: boolean;
      force?: boolean;
    },
  ): Promise<RecommendationRunResult> {
    const persist = options.persist ?? true;
    const force = options.force ?? options.trigger === 'manual';

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      include: {
        city: { select: { name: true } },
        advisor: { select: { id: true } },
      },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');

    const base = {
      propertyId,
      propertyCode: String(property.code || propertyId),
      advisorId: property.advisor?.id ?? null,
      trigger: options.trigger,
    };

    // Se toma antes de leer clientes para no perder los que se creen durante la ejecución.
    const runStartedAt = new Date();
    const compactProperty = buildRecommendationProperty(property);
    const hash = computeRecommendationHash(compactProperty);
    const propertyChanged =
      !property.recommendationRunAt || property.recommendationHash !== hash;
    const mode: RecommendationMode =
      force || propertyChanged ? 'full' : 'delta';
    // Botón manual: se reevalúan también los interesados que puso la IA y luego se reemplazan
    // (los manuales nunca se tocan). En automático solo se agregan/actualizan.
    const reconcileMode = force ? 'replaceAi' : 'merge';

    const clients = (
      await this.prisma.client.findMany({
        where: {
          OR: [
            { interestDescription: { not: null } },
            { notes: { not: null } },
          ],
          interests: force
            ? { none: { propertyId, source: InterestSource.manual } }
            : { none: { propertyId } },
          // Calificados por el equipo para esta propiedad: dislike = bloqueado, like = ya confirmado.
          recommendationFeedback: { none: { propertyId, deletedAt: null } },
          ...(mode === 'delta' && {
            interestUpdatedAt: { gt: property.recommendationRunAt! },
          }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          interestDescription: true,
          notes: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    ).filter(hasRecommendationText);

    if (mode === 'delta' && clients.length === 0) {
      return {
        ...base,
        status: 'skipped',
        candidates: [],
        summary: null,
        error: null,
        mode,
        clientsEvaluated: 0,
        aiCalls: 0,
      };
    }

    const markRun = async () => {
      if (!persist) return;
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { recommendationHash: hash, recommendationRunAt: runStartedAt },
        select: { id: true },
      });
    };

    if (clients.length === 0 && reconcileMode === 'merge') {
      await markRun();
      return {
        ...base,
        status: 'no_candidates',
        candidates: [],
        summary: null,
        error: null,
        mode,
        clientsEvaluated: 0,
        aiCalls: 0,
      };
    }

    this.logger.log(
      `Recommendation ${options.trigger} for ${base.propertyCode}: mode=${mode}, clients=${clients.length}`,
    );
    const learning = await this.feedbackService.getLearningExamples();
    const result = await this.recommender.recommendCandidates({
      property: compactProperty,
      clients: clients.map(buildRecommendationClient),
      learning,
    });
    if (!result.ok) {
      this.logger.warn(
        `Recommendation ${options.trigger} for ${base.propertyCode} failed (${result.reason}): ${result.detail}`,
      );
      return {
        ...base,
        status: 'failed',
        candidates: [],
        summary: null,
        error: describeRecommenderFailure(result.reason),
        mode,
        clientsEvaluated: clients.length,
      };
    }

    // Los nombres no se envían a la IA: se completan desde la BD.
    const names = new Map(
      clients.map((c) => [
        c.id,
        `${c.firstName} ${c.lastName}`.replace(/\s+/g, ' ').trim(),
      ]),
    );
    const candidates = result.candidates.map((c) => ({
      ...c,
      name: names.get(c.client_id) ?? c.name,
    }));

    const applied = await this.apply(base, candidates, persist, reconcileMode);
    if (applied.status !== 'failed') await markRun();
    return {
      ...applied,
      mode,
      clientsEvaluated: clients.length,
      aiCalls: result.calls,
    };
  }

  /** Re-applies the candidates stored in the latest AI notification, without calling n8n. */
  async restoreLast(propertyId: string): Promise<RecommendationRunResult> {
    const property = await this.loadProperty(propertyId);
    const last = await this.findLastCandidates(propertyId);
    if (!last) {
      throw new NotFoundException(
        'No hay una recomendación IA previa para restaurar en esta propiedad',
      );
    }
    return this.apply(
      {
        propertyId,
        propertyCode: String(property.code || propertyId),
        advisorId: property.advisor?.id ?? null,
        trigger: 'restore',
      },
      last.candidates,
      true,
      'replaceAi',
    );
  }

  async lastRecommendationInfo(propertyId: string) {
    await this.loadProperty(propertyId);
    const last = await this.findLastCandidates(propertyId);
    return last
      ? {
          available: true,
          candidates: last.candidates.length,
          createdAt: last.createdAt,
        }
      : { available: false, candidates: 0, createdAt: null };
  }

  private async findLastCandidates(propertyId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { entityType: 'property', entityId: propertyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { createdAt: true, payload: true },
    });
    for (const n of notifications) {
      const raw = (n.payload as { candidates?: unknown } | null)?.candidates;
      if (!Array.isArray(raw)) continue;
      const candidates = raw
        .map((c) => c as Partial<RecommendedCandidate>)
        .filter((c) => c?.client_id)
        .map((c) => ({
          client_id: String(c.client_id),
          name: String(c.name ?? ''),
          interest_level: (c.interest_level ??
            'MEDIO') as RecommendedCandidate['interest_level'],
          reason: String(c.reason ?? ''),
          score: c.score,
        }));
      if (candidates.length > 0) return { candidates, createdAt: n.createdAt };
    }
    return null;
  }

  private async apply(
    base: Omit<
      RecommendationRunResult,
      'status' | 'candidates' | 'summary' | 'error'
    >,
    candidates: RecommendedCandidate[],
    persist: boolean,
    reconcileMode: 'merge' | 'replaceAi',
  ): Promise<RecommendationRunResult> {
    // In automatic runs an empty answer never touches the list. With `replaceAi`
    // (manual button) an empty answer removes the previous AI recommendations;
    // interested clients registered by hand are never touched in either mode.
    if (candidates.length === 0 && reconcileMode === 'merge') {
      return {
        ...base,
        status: 'no_candidates',
        candidates,
        summary: null,
        error: null,
      };
    }
    if (!persist) {
      return {
        ...base,
        status: 'preview',
        candidates,
        summary: null,
        error: null,
      };
    }

    try {
      const { summary } =
        await this.propertyInterestsService.reconcileRecommendations(
          base.propertyId,
          candidates,
          { mode: reconcileMode },
        );
      const s = {
        created: summary.created,
        updated: summary.updated,
        deleted: summary.deleted,
        discarded: summary.discarded,
      };
      if (s.discarded > 0) {
        this.logger.warn(
          `Recommendation for ${base.propertyCode}: ${s.discarded} candidate(s) discarded (client_id not found)`,
        );
      }
      return {
        ...base,
        status:
          s.created || s.updated || s.deleted
            ? 'applied'
            : candidates.length === 0
              ? 'no_candidates'
              : 'no_changes',
        candidates,
        summary: s,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error persisting interests for property ${base.propertyCode}: ${message}`,
      );
      return {
        ...base,
        status: 'failed',
        candidates,
        summary: null,
        error: `no se pudieron guardar los interesados (${message})`,
      };
    }
  }
}

/** Notification / toast copy for a run, shared so every entry point says the same thing. */
export function describeRecommendationRun(r: RecommendationRunResult): {
  title: string;
  message: string;
} {
  const discarded = r.summary?.discarded
    ? ` ${r.summary.discarded} recomendado(s) se descartaron porque no existen en Clientes.`
    : '';
  switch (r.status) {
    case 'applied':
      return {
        title: 'Recomendación IA aplicada',
        message: `Interesados de ${r.propertyCode} actualizados: ${r.summary!.created} nuevo(s), ${r.summary!.updated} actualizado(s), ${r.summary!.deleted} removido(s).${discarded}`,
      };
    case 'no_changes':
      return {
        title: 'Recomendación IA finalizada',
        message: `Se analizaron ${r.candidates.length} cliente(s) para ${r.propertyCode}; la lista de interesados ya estaba al día.${discarded}`,
      };
    case 'no_candidates':
      return {
        title: 'Recomendación IA finalizada',
        message: `La IA no encontró clientes para ${r.propertyCode}. La lista de interesados no se modificó.`,
      };
    case 'preview':
      return {
        title: 'Recomendación IA lista',
        message: `La IA sugirió ${r.candidates.length} cliente(s) para ${r.propertyCode}.`,
      };
    case 'skipped':
      return {
        title: 'Recomendación IA sin cambios',
        message: `La propiedad ${r.propertyCode} y los clientes no cambiaron desde la última recomendación; no se volvió a ejecutar la IA.`,
      };
    case 'failed':
      return {
        title: 'Recomendación IA no completada',
        message: `No se pudo completar la recomendación para ${r.propertyCode}: ${r.error}. La lista de interesados no se modificó.`,
      };
  }
}
