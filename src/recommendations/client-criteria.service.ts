import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  ClientCriteria,
  CriteriaIntent,
  Prisma,
  PropertyType,
  Topography,
  Zone,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientCriteriaAiService } from '../ai/client-criteria-ai.service';
import { toNumbers } from '../ai/utils/text-guards';
import { parseClientCriteria } from './criteria-parser';
import {
  ClientCriteriaData,
  ParseContext,
  ParseResult,
} from './criteria.types';
import { normalizeText } from './text-utils';

/** Súbela si cambias el parser por reglas: los criterios de todos los clientes se vuelven a leer. */
export const PARSER_VERSION = 'parser-v3';

const sha = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

const PROPERTY_TYPES = new Set<string>(Object.values(PropertyType));
const TOPOGRAPHIES = new Set<string>(Object.values(Topography));
const ZONES = new Set<string>(Object.values(Zone));
const INTENTS = new Set<string>(Object.values(CriteriaIntent));
const SERVICES = new Set([
  'agua',
  'luz',
  'alcantarillado',
  'riego',
  'internet',
  'telefono',
]);
const USES = new Set([
  'vivienda',
  'agricola',
  'inversion',
  'comercial',
  'recreacion',
]);
const FEATURES = new Set([
  'dormitorios',
  'banos',
  'jardin',
  'parqueadero',
  'frutales',
  'vista',
  'piscina',
  'departamentos',
  'local comercial',
  'acceso vial',
]);

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .map((v) => v.trim())
    : [];

export const sourceHashOf = (
  interest: string | null | undefined,
  notes: string | null | undefined,
) => sha(`${normalizeText(interest)}|${normalizeText(notes)}`);

export const criteriaHashOf = (criteria: ClientCriteriaData) => {
  const sorted = Object.fromEntries(
    Object.entries(criteria)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [
        k,
        Array.isArray(v) ? [...(v as unknown[])].map(String).sort() : v,
      ]),
  );
  return sha(JSON.stringify(sorted));
};

/**
 * Valida lo que devolvió la IA: solo ciudades de la tabla `cities`, solo valores conocidos y solo
 * cifras que aparecen en el texto (con cualquiera de sus variantes). Lo que no pasa se toma de las reglas.
 */
export const mergeAiCriteria = (
  raw: Record<string, unknown>,
  rules: ParseResult,
  text: string,
  context: ParseContext,
): { criteria: ClientCriteriaData; rejected: string[] } => {
  const base = rules.criteria;
  const rejected: string[] = [];
  const cityByNorm = new Map(context.cities.map((c) => [normalizeText(c), c]));
  const cities = (value: unknown) => [
    ...new Set(
      stringList(value)
        .map((c) => cityByNorm.get(normalizeText(c)))
        .filter((c): c is string => Boolean(c)),
    ),
  ];

  const allowed = new Set<number>([
    ...rules.knownNumbers,
    ...toNumbers(text).map(Number),
  ]);
  const number = (
    field: string,
    value: unknown,
    fallback: number | null,
  ): number | null => {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (allowed.has(Math.round(n))) return Math.round(n);
    rejected.push(`${field}=${n}`);
    return fallback;
  };

  const minutes = Number(raw.max_minutes_center);
  const criteria: ClientCriteriaData = {
    intent: INTENTS.has(String(raw.intent))
      ? (raw.intent as CriteriaIntent)
      : base.intent,
    acceptedTypes: stringList(raw.accepted_types).filter((t) =>
      PROPERTY_TYPES.has(t),
    ) as PropertyType[],
    genericType: raw.generic_type === true,
    acceptedCities: cities(raw.accepted_cities),
    excludedCities: cities(raw.excluded_cities),
    acceptedSectors: stringList(raw.accepted_sectors)
      .filter((s) => s.length <= 60)
      .slice(0, 6),
    maxMinutesCenter:
      Number.isInteger(minutes) &&
      minutes > 0 &&
      minutes <= 180 &&
      toNumbers(text).includes(String(minutes))
        ? minutes
        : base.maxMinutesCenter,
    nearCenter: raw.near_center === true,
    minLandM2: number('min_land_m2', raw.min_land_m2, base.minLandM2),
    maxLandM2: number('max_land_m2', raw.max_land_m2, base.maxLandM2),
    minConstructionM2: number(
      'min_construction_m2',
      raw.min_construction_m2,
      base.minConstructionM2,
    ),
    minBudgetUsd: number(
      'min_budget_usd',
      raw.min_budget_usd,
      base.minBudgetUsd,
    ),
    maxBudgetUsd: number(
      'max_budget_usd',
      raw.max_budget_usd,
      base.maxBudgetUsd,
    ),
    topographies: stringList(raw.topographies).filter((t) =>
      TOPOGRAPHIES.has(t),
    ) as Topography[],
    zones: stringList(raw.zones).filter((z) => ZONES.has(z)) as Zone[],
    requiredServices: stringList(raw.required_services).filter((s) =>
      SERVICES.has(s),
    ),
    uses: stringList(raw.uses).filter((u) => USES.has(u)),
    wantedFeatures: stringList(raw.wanted_features).filter((f) =>
      FEATURES.has(f),
    ),
  };
  if (criteria.acceptedTypes.length > 0) criteria.genericType = false;
  return { criteria, rejected };
};

/** Cifras imposibles (no caben en la BD o son errores de lectura) se descartan. */
export const sanitizeCriteria = (
  criteria: ClientCriteriaData,
): ClientCriteriaData => {
  const amount = (v: number | null) =>
    v !== null && Number.isFinite(v) && v > 0 && v < 1_000_000_000 ? v : null;
  const minutes = criteria.maxMinutesCenter;
  return {
    ...criteria,
    minLandM2: amount(criteria.minLandM2),
    maxLandM2: amount(criteria.maxLandM2),
    minConstructionM2: amount(criteria.minConstructionM2),
    minBudgetUsd: amount(criteria.minBudgetUsd),
    maxBudgetUsd: amount(criteria.maxBudgetUsd),
    maxMinutesCenter:
      minutes !== null &&
      Number.isInteger(minutes) &&
      minutes > 0 &&
      minutes <= 600
        ? minutes
        : null,
  };
};

/** Fila de la BD → criterios (Decimal → number). */
export const criteriaFromRow = (row: ClientCriteria): ClientCriteriaData => {
  const num = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
  return {
    intent: row.intent,
    acceptedTypes: row.acceptedTypes,
    genericType: row.genericType,
    acceptedCities: row.acceptedCities,
    excludedCities: row.excludedCities,
    acceptedSectors: row.acceptedSectors,
    maxMinutesCenter: row.maxMinutesCenter,
    nearCenter: row.nearCenter,
    minLandM2: num(row.minLandM2),
    maxLandM2: num(row.maxLandM2),
    minConstructionM2: num(row.minConstructionM2),
    minBudgetUsd: num(row.minBudgetUsd),
    maxBudgetUsd: num(row.maxBudgetUsd),
    topographies: row.topographies,
    zones: row.zones,
    requiredServices: row.requiredServices,
    uses: row.uses,
    wantedFeatures: row.wantedFeatures,
  };
};

export interface ExtractionSummary {
  extracted: number;
  byRules: number;
  byAi: number;
  aiCalls: number;
  aiFailed: number;
  cleared: number;
  /** Clientes que no se pudieron guardar (se reintentan en la próxima sincronización). */
  errors: number;
  /** Clientes cuyos criterios cambiaron (hay que recalcular sus matches). */
  changedClientIds: string[];
}

interface ClientSource {
  id: string;
  interestDescription: string | null;
  notes: string | null;
  criteria: {
    sourceHash: string;
    extractorVersion: string;
    criteriaHash: string;
  } | null;
}

/**
 * Lee lo que busca cada cliente y lo guarda en `client_criteria`.
 * Primero reglas; IA solo para los textos que las reglas no resuelven con seguridad.
 */
@Injectable()
export class ClientCriteriaService {
  private readonly logger = new Logger(ClientCriteriaService.name);
  private contextCache: { value: ParseContext; expiresAt: number } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: ClientCriteriaAiService,
  ) {}

  extractorVersion(): string {
    return sha(`${PARSER_VERSION}|${this.ai.promptSignature()}`);
  }

  /** Ciudades de la tabla `cities` y sectores de las propiedades (cache de 10 min). */
  async getContext(): Promise<ParseContext> {
    if (this.contextCache && this.contextCache.expiresAt > Date.now())
      return this.contextCache.value;
    const [cities, sectors] = await Promise.all([
      this.prisma.city.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.property.findMany({
        where: { deletedAt: null, referenceSector: { not: null } },
        select: { referenceSector: true },
        distinct: ['referenceSector'],
      }),
    ]);
    const value: ParseContext = {
      cities: cities.map((c) => c.name),
      sectors: [
        ...new Set(
          sectors
            .map((s) => s.referenceSector?.trim() ?? '')
            .filter((s) => s.length >= 4 && s.length <= 40),
        ),
      ],
    };
    this.contextCache = { value, expiresAt: Date.now() + 10 * 60_000 };
    return value;
  }

  private clientSelect = {
    id: true,
    interestDescription: true,
    notes: true,
    criteria: {
      select: { sourceHash: true, extractorVersion: true, criteriaHash: true },
    },
  } satisfies Prisma.ClientSelect;

  /** Clientes cuyo texto cambió, o que se leyeron con otra versión del extractor, o sin criterios. */
  async findClientsNeedingExtraction(): Promise<string[]> {
    const version = this.extractorVersion();
    const clients = await this.prisma.client.findMany({
      select: this.clientSelect,
    });
    return clients
      .filter((c) => this.needsExtraction(c, version))
      .map((c) => c.id);
  }

  private needsExtraction(client: ClientSource, version: string): boolean {
    const hasText = Boolean(
      normalizeText(client.interestDescription) || normalizeText(client.notes),
    );
    if (!hasText) return client.criteria !== null;
    if (!client.criteria) return true;
    return (
      client.criteria.sourceHash !==
        sourceHashOf(client.interestDescription, client.notes) ||
      client.criteria.extractorVersion !== version
    );
  }

  /**
   * Extrae y guarda los criterios. `force` vuelve a leer aunque nada haya cambiado.
   * Si la IA falla, se guardan los criterios por reglas (la próxima versión del extractor reintenta).
   */
  async extractClients(
    clientIds: string[],
    options: { force?: boolean } = {},
  ): Promise<ExtractionSummary> {
    const summary: ExtractionSummary = {
      extracted: 0,
      byRules: 0,
      byAi: 0,
      aiCalls: 0,
      aiFailed: 0,
      cleared: 0,
      errors: 0,
      changedClientIds: [],
    };
    if (clientIds.length === 0) return summary;
    const version = this.extractorVersion();
    const context = await this.getContext();
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: this.clientSelect,
    });

    const pending: Array<{
      client: ClientSource;
      text: string;
      rules: ParseResult;
    }> = [];
    for (const client of clients) {
      if (!options.force && !this.needsExtraction(client, version)) continue;
      const text = [client.interestDescription, client.notes]
        .map((t) => t?.trim())
        .filter(Boolean)
        .join('. ');
      if (!normalizeText(text)) {
        // Sin interés escrito: no hay nada que recomendar.
        await this.prisma.$transaction([
          this.prisma.propertyMatch.deleteMany({
            where: { clientId: client.id },
          }),
          this.prisma.clientCriteria.deleteMany({
            where: { clientId: client.id },
          }),
        ]);
        summary.cleared += 1;
        continue;
      }
      pending.push({
        client,
        text,
        rules: parseClientCriteria(
          client.interestDescription,
          client.notes,
          context,
        ),
      });
    }

    const needAi = pending.filter((p) => p.rules.ambiguities.length > 0);
    let aiItems = new Map<string, Record<string, unknown>>();
    if (needAi.length > 0 && this.ai.isEnabled()) {
      const result = await this.ai.extract(
        needAi.map((p) => ({
          id: p.client.id,
          texto: p.text.slice(0, 600),
          reglas: p.rules.criteria,
          dudas: p.rules.ambiguities,
        })),
        context,
      );
      if (result.ok) {
        aiItems = result.items;
        summary.aiCalls = result.calls;
      } else {
        summary.aiFailed = needAi.length;
      }
    }

    for (const { client, text, rules } of pending) {
      try {
        const raw = aiItems.get(client.id);
        let criteria = rules.criteria;
        let method = 'rules';
        let aiNotes: string | null =
          rules.ambiguities.length > 0
            ? `Dudas sin IA: ${rules.ambiguities.join('; ')}`
            : null;
        if (raw) {
          const merged = mergeAiCriteria(raw, rules, text, context);
          criteria = merged.criteria;
          method = 'ai';
          aiNotes =
            [
              typeof raw.notes === 'string' ? raw.notes.trim() : '',
              merged.rejected.length > 0
                ? `Cifras descartadas: ${merged.rejected.join(', ')}`
                : '',
            ]
              .filter(Boolean)
              .join(' | ') || null;
          if (merged.rejected.length > 0)
            this.logger.warn(
              `Criterios IA de ${client.id}: cifras que no están en el texto descartadas (${merged.rejected.join(', ')})`,
            );
        }
        criteria = sanitizeCriteria(criteria);
        const criteriaHash = criteriaHashOf(criteria);
        const data = {
          ...criteria,
          method,
          extractorVersion: version,
          sourceHash: sourceHashOf(client.interestDescription, client.notes),
          criteriaHash,
          aiNotes,
          extractedAt: new Date(),
        };
        await this.prisma.clientCriteria.upsert({
          where: { clientId: client.id },
          create: { clientId: client.id, ...data },
          update: data,
        });
        summary.extracted += 1;
        if (method === 'ai') summary.byAi += 1;
        else summary.byRules += 1;
        if (client.criteria?.criteriaHash !== criteriaHash)
          summary.changedClientIds.push(client.id);
      } catch (error) {
        summary.errors += 1;
        this.logger.warn(
          `No se pudieron guardar los criterios del cliente ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (summary.extracted > 0 || summary.cleared > 0)
      this.logger.log(
        `Criterios: ${summary.extracted} extraído(s) (${summary.byRules} por reglas, ${summary.byAi} con IA en ${summary.aiCalls} llamada(s)), ${summary.cleared} sin interés, ${summary.errors} con error`,
      );
    return summary;
  }

  async getForClient(clientId: string) {
    return this.prisma.clientCriteria.findUnique({ where: { clientId } });
  }
}
