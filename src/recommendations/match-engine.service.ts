import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FeedbackRating, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { criteriaFromRow } from './client-criteria.service';
import { firstAreaInText } from './criteria-parser';
import { normalizeText } from './text-utils';
import type { PropertyMatchData } from './criteria.types';
import {
  AREA_TOLERANCE,
  MATCH_RULES_VERSION,
  MatchResult,
  evaluateMatch,
  normalizePropertyServices,
} from './match-rules';

const sha = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

/** Campos del formulario que usa el matching (nunca las descripciones públicas). */
export const propertyMatchSelect = {
  id: true,
  status: true,
  deletedAt: true,
  propertyType: true,
  referenceSector: true,
  address: true,
  landArea: true,
  constructionArea: true,
  topography: true,
  zone: true,
  basicServices: true,
  hasBasicServices: true,
  cityTime: true,
  price: true,
  features: true,
  observations: true,
  recommendationHash: true,
  advisorId: true,
  code: true,
  city: { select: { name: true } },
} satisfies Prisma.PropertySelect;

type PropertyRow = Prisma.PropertyGetPayload<{
  select: typeof propertyMatchSelect;
}>;

const minutesToCenterInText = (text: string): number | null => {
  const m = /\ba\s+(\d{1,3})\s*(?:min\b|minutos?)\s+(?:del|al)\s+centro\b/.exec(
    text,
  );
  return m ? Number(m[1]) : null;
};

const positive = (
  value: Prisma.Decimal | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const toPropertyMatchData = (row: PropertyRow): PropertyMatchData => {
  const text = [row.features, row.observations, row.address]
    .filter(Boolean)
    .join('. ');
  return {
    id: row.id,
    type: row.propertyType,
    city: row.city?.name ?? null,
    sector: row.referenceSector?.trim() || null,
    // Formulario sin área: se toma la que el asesor escribió en la descripción.
    landArea: positive(row.landArea) ?? firstAreaInText(normalizeText(text)),
    constructionArea: positive(row.constructionArea),
    topography: row.topography ?? null,
    zone: row.zone ?? null,
    services: normalizePropertyServices(
      row.hasBasicServices ? row.basicServices : [],
      text,
    ),
    // Formulario sin minutos: los que el asesor escribió ("a 6 minutos del centro").
    cityTime:
      positive(row.cityTime) ?? minutesToCenterInText(normalizeText(text)),
    price: positive(row.price),
    text,
  };
};

/** Huella de lo que usa el matching de la propiedad + versión de reglas. */
export const propertyMatchHash = (data: PropertyMatchData): string =>
  `${sha(JSON.stringify(data))}:${MATCH_RULES_VERSION}`;

export const clientMatchHash = (criteriaHash: string): string =>
  `${criteriaHash}:${MATCH_RULES_VERSION}`;

export interface RecomputeSummary {
  created: number;
  updated: number;
  deleted: number;
  total: number;
  /** Clientes (recomputeProperty) o propiedades (recomputeClient) con un ALTO nuevo. */
  newAlto: string[];
}

const emptySummary = (): RecomputeSummary => ({
  created: 0,
  updated: 0,
  deleted: 0,
  total: 0,
  newAlto: [],
});

/**
 * Calcula y guarda las coincidencias propiedad ↔ cliente con reglas (sin IA).
 * Idempotente: repetirlo con los mismos datos no cambia nada; borra lo que deja de calificar.
 */
@Injectable()
export class MatchEngineService {
  private readonly logger = new Logger(MatchEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcula los clientes candidatos de UNA propiedad. Con `onlyIfChanged` no hace nada si su huella
   * (datos del formulario + versión de reglas) es la misma del último cálculo.
   */
  async recomputeProperty(
    propertyId: string,
    options: { onlyIfChanged?: boolean } = {},
  ): Promise<RecomputeSummary> {
    const row = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: propertyMatchSelect,
    });
    if (!row || row.deletedAt || row.status !== PropertyStatus.Nuevo) {
      // Vendida, en negociación o eliminada: ya no se recomienda.
      const { count } = await this.prisma.propertyMatch.deleteMany({
        where: { propertyId },
      });
      return { ...emptySummary(), deleted: count };
    }
    const data = toPropertyMatchData(row);
    if (
      options.onlyIfChanged &&
      row.recommendationHash === propertyMatchHash(data)
    )
      return emptySummary();
    const and: Prisma.ClientCriteriaWhereInput[] = [
      { OR: [{ acceptedTypes: { has: data.type } }, { genericType: true }] },
      data.city
        ? {
            OR: [
              { acceptedCities: { isEmpty: true } },
              { acceptedCities: { has: data.city } },
            ],
          }
        : { acceptedCities: { isEmpty: true } },
    ];
    if (data.city) and.push({ NOT: { excludedCities: { has: data.city } } });
    if (data.price !== null)
      and.push({
        OR: [{ maxBudgetUsd: null }, { maxBudgetUsd: { gte: data.price } }],
      });
    if (data.landArea !== null && data.type !== 'Departamento')
      and.push({
        OR: [
          { minLandM2: null },
          { minLandM2: { lte: data.landArea / AREA_TOLERANCE } },
        ],
      });

    const candidates = await this.prisma.clientCriteria.findMany({
      where: {
        intent: 'COMPRA',
        AND: and,
        client: {
          recommendationFeedback: {
            none: {
              propertyId,
              rating: FeedbackRating.dislike,
              deletedAt: null,
            },
          },
        },
      },
    });

    if (
      candidates.length === 0 &&
      (await this.prisma.clientCriteria.count()) === 0
    ) {
      this.logger.warn(
        'Ningún cliente tiene criterios leídos todavía: ejecuta POST /recommendations/sync (o espera la sincronización al arrancar / el cron).',
      );
    }

    const results = new Map<
      string,
      { result: MatchResult; clientVersion: string }
    >();
    for (const criteria of candidates) {
      const result = evaluateMatch(data, criteriaFromRow(criteria));
      if (result)
        results.set(criteria.clientId, {
          result,
          clientVersion: criteria.criteriaHash,
        });
    }

    const propertyVersion = propertyMatchHash(data);
    const summary = await this.save(
      { propertyId },
      [...results].map(([clientId, r]) => ({ propertyId, clientId, ...r })),
      propertyVersion,
      (m) => m.clientId,
    );
    await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        recommendationHash: propertyVersion,
        recommendationRunAt: new Date(),
      },
      select: { id: true },
    });
    this.logger.log(
      `Matches de ${row.code}: ${summary.total} (${summary.created} nuevos, ${summary.updated} actualizados, ${summary.deleted} quitados)`,
    );
    return summary;
  }

  /** Recalcula las propiedades candidatas de UN cliente. */
  async recomputeClient(clientId: string): Promise<RecomputeSummary> {
    const criteriaRow = await this.prisma.clientCriteria.findUnique({
      where: { clientId },
    });
    if (!criteriaRow || criteriaRow.intent !== 'COMPRA') {
      const { count } = await this.prisma.propertyMatch.deleteMany({
        where: { clientId },
      });
      if (criteriaRow)
        await this.prisma.clientCriteria.update({
          where: { clientId },
          data: { matchedHash: clientMatchHash(criteriaRow.criteriaHash) },
        });
      return { ...emptySummary(), deleted: count };
    }
    const criteria = criteriaFromRow(criteriaRow);
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.Nuevo,
      deletedAt: null,
      recommendationFeedback: {
        none: { clientId, rating: FeedbackRating.dislike, deletedAt: null },
      },
    };
    if (!criteria.genericType && criteria.acceptedTypes.length > 0)
      where.propertyType = { in: criteria.acceptedTypes };
    const cityFilter: Prisma.CityWhereInput = {};
    if (criteria.acceptedCities.length > 0)
      cityFilter.name = { in: criteria.acceptedCities };
    if (criteria.excludedCities.length > 0)
      cityFilter.AND = [{ name: { notIn: criteria.excludedCities } }];
    if (Object.keys(cityFilter).length > 0) where.city = cityFilter;
    if (criteria.maxBudgetUsd !== null)
      where.price = { lte: criteria.maxBudgetUsd };

    const rows = await this.prisma.property.findMany({
      where,
      select: propertyMatchSelect,
    });
    const clientVersion = criteriaRow.criteriaHash;
    const matches: Array<{
      propertyId: string;
      clientId: string;
      result: MatchResult;
      clientVersion: string;
      propertyVersion: string;
    }> = [];
    for (const row of rows) {
      const data = toPropertyMatchData(row);
      const result = evaluateMatch(data, criteria);
      if (result)
        matches.push({
          propertyId: row.id,
          clientId,
          result,
          clientVersion,
          propertyVersion: propertyMatchHash(data),
        });
    }

    const summary = await this.save(
      { clientId },
      matches,
      null,
      (m) => m.propertyId,
    );
    await this.prisma.clientCriteria.update({
      where: { clientId },
      data: { matchedHash: clientMatchHash(criteriaRow.criteriaHash) },
    });
    return summary;
  }

  /**
   * Guarda el resultado de un recálculo dentro de un alcance (una propiedad o un cliente):
   * crea los nuevos, actualiza los que cambiaron y borra los que ya no califican.
   */
  private async save(
    scope: { propertyId: string } | { clientId: string },
    items: Array<{
      propertyId: string;
      clientId: string;
      result: MatchResult;
      clientVersion: string;
      propertyVersion?: string;
    }>,
    propertyVersion: string | null,
    keyOf: (m: { propertyId: string; clientId: string }) => string,
  ): Promise<RecomputeSummary> {
    const summary = emptySummary();
    summary.total = items.length;
    const existing = await this.prisma.propertyMatch.findMany({ where: scope });
    const existingByKey = new Map(existing.map((m) => [keyOf(m), m]));
    const wanted = new Set(items.map(keyOf));

    const toCreate: Prisma.PropertyMatchCreateManyInput[] = [];
    const toUpdate: Array<{
      propertyId: string;
      clientId: string;
      data: Prisma.PropertyMatchUpdateInput;
    }> = [];
    for (const item of items) {
      const prev = existingByKey.get(keyOf(item));
      const data = {
        level: item.result.level,
        score: item.result.score,
        matched: item.result.matched,
        unconfirmed: item.result.unconfirmed,
        explanation: item.result.explanation,
        propertyVersion: item.propertyVersion ?? propertyVersion ?? '',
        clientVersion: item.clientVersion,
        rulesVersion: MATCH_RULES_VERSION,
      };
      if (!prev) {
        toCreate.push({
          propertyId: item.propertyId,
          clientId: item.clientId,
          ...data,
        });
        if (data.level === 'ALTO') summary.newAlto.push(keyOf(item));
        continue;
      }
      const changed =
        prev.level !== data.level ||
        prev.score !== data.score ||
        prev.explanation !== data.explanation ||
        prev.propertyVersion !== data.propertyVersion ||
        prev.clientVersion !== data.clientVersion ||
        prev.rulesVersion !== data.rulesVersion;
      if (changed) {
        toUpdate.push({
          propertyId: item.propertyId,
          clientId: item.clientId,
          data: { ...data, calculatedAt: new Date() },
        });
        if (data.level === 'ALTO' && prev.level !== 'ALTO')
          summary.newAlto.push(keyOf(item));
      }
    }
    const toDelete = existing.filter((m) => !wanted.has(keyOf(m)));

    await this.prisma.$transaction(
      async (tx) => {
        if (toDelete.length > 0)
          await tx.propertyMatch.deleteMany({
            where: {
              OR: toDelete.map((m) => ({
                propertyId: m.propertyId,
                clientId: m.clientId,
              })),
            },
          });
        if (toCreate.length > 0)
          await tx.propertyMatch.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        for (const u of toUpdate)
          await tx.propertyMatch.update({
            where: {
              propertyId_clientId: {
                propertyId: u.propertyId,
                clientId: u.clientId,
              },
            },
            data: u.data,
          });
      },
      { timeout: 60_000 },
    );
    summary.created = toCreate.length;
    summary.updated = toUpdate.length;
    summary.deleted = toDelete.length;
    return summary;
  }

  /** Propiedades en Nuevo cuya huella cambió (datos o reglas) y las que salieron de Nuevo con matches. */
  async findPropertiesToRecompute(): Promise<string[]> {
    const rows = await this.prisma.property.findMany({
      where: { deletedAt: null, status: PropertyStatus.Nuevo },
      select: propertyMatchSelect,
    });
    const stale = rows
      .filter(
        (row) =>
          row.recommendationHash !==
          propertyMatchHash(toPropertyMatchData(row)),
      )
      .map((row) => row.id);
    const orphan = await this.prisma.propertyMatch.findMany({
      where: {
        property: {
          OR: [
            { deletedAt: { not: null } },
            { status: { not: PropertyStatus.Nuevo } },
          ],
        },
      },
      select: { propertyId: true },
      distinct: ['propertyId'],
    });
    return [...new Set([...stale, ...orphan.map((o) => o.propertyId)])];
  }

  /** Clientes cuyos criterios cambiaron desde su último recálculo (o con reglas viejas). */
  async findClientsToRecompute(): Promise<string[]> {
    const rows = await this.prisma.clientCriteria.findMany({
      select: { clientId: true, criteriaHash: true, matchedHash: true },
    });
    return rows
      .filter((r) => r.matchedHash !== clientMatchHash(r.criteriaHash))
      .map((r) => r.clientId);
  }
}
