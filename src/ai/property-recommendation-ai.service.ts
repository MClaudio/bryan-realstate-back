import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import aiConfig from './ai.config';
import {
  PROPERTY_RECOMMENDATION_SCHEMA,
  PROPERTY_RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts/property-recommendation.prompt';
import { toNumbers } from './utils/text-guards';

export type AiInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';

export interface AiRecommendationClient {
  id: string;
  i?: string;
  n?: string;
}

/** Recomendaciones calificadas por el equipo, usadas como ejemplos para que la IA aprenda. */
export interface AiLearningExample {
  propiedad: string;
  busca: string;
  ia: string;
  motivo?: string;
  comentario?: string;
}

export interface AiLearningExamples {
  incorrectas: AiLearningExample[];
  correctas: AiLearningExample[];
}

export interface AiRecommendationMatch {
  client_id: string;
  interest_level: AiInterestLevel;
  reason: string;
  score: number;
}

export type AiRecommendationFailure =
  | 'disabled'
  | 'no_credit'
  | 'timeout'
  | 'network'
  | 'http'
  | 'unparseable';

export type AiRecommendationResult =
  | { ok: true; matches: AiRecommendationMatch[]; calls: number }
  | { ok: false; reason: AiRecommendationFailure; detail: string };

interface CompletionResult {
  output: unknown;
  finishReason: string | null;
  refusal: string | null;
}

const LEVEL_RANK: Record<AiInterestLevel, number> = {
  BAJO: 0,
  MEDIO: 1,
  ALTO: 2,
};
/** Rango de puntaje de cada nivel (el puntaje se ajusta al nivel final). */
const SCORE_BANDS: Record<AiInterestLevel, [number, number]> = {
  ALTO: [80, 100],
  MEDIO: [60, 79],
  BAJO: [40, 59],
};
const MAX_REASON_LENGTH = 400;

/**
 * Regla de área aplicada en código: el área mínima pedida por el cliente admite hasta 10 % menos,
 * pero esa coincidencia queda como BAJO y se explica en el motivo. Debajo de eso no se recomienda.
 * El presupuesto NO tiene margen: precio mayor al presupuesto = no se recomienda.
 */
export const AREA_RULES = {
  toleranceMin: 0.9,
} as const;

/** Tipos cuya área relevante es el terreno; en Departamento es la construcción. */
const LAND_TYPES = new Set(['terreno', 'lote', 'finca']);

const formatM2 = (value: number) =>
  `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m²`;

const minLevel = (a: AiInterestLevel, b: AiInterestLevel): AiInterestLevel =>
  LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;

const flag = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null => {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (allowed as readonly string[]).includes(text) ? (text as T) : null;
};

/** "500 m2", "1.200 metros cuadrados", "2 hectáreas"… (número + unidad de superficie). */
const AREA_PATTERN =
  /(\d[\d.,]*)\s*(m2|m²|mts2|mts|metros(?:\s+cuadrados)?|hect[aá]reas?|ha\b)/gi;
/** Antes del número: es un máximo, no un mínimo ("hasta 1000 m2"). */
const AREA_MAX_BEFORE = /(hasta|m[aá]ximo|menos\s+de|no\s+m[aá]s\s+de)\s*$/i;
/** Antes del número: es una distancia ("a 200 metros de la vía"), salvo "mayor a 500 metros". */
const AREA_DISTANCE_BEFORE = /\ba\s*$/i;
const AREA_COMPARISON_BEFORE = /(mayor|superior|igual)\s+a\s*$/i;

/** Áreas en m² que aparecen en un texto, ignorando distancias y (opcionalmente) máximos. */
const areasInText = (text: string, skipMaximums: boolean): number[] => {
  const areas: number[] = [];
  for (const match of text.matchAll(AREA_PATTERN)) {
    const before = text.slice(Math.max(0, match.index - 30), match.index);
    if (skipMaximums && AREA_MAX_BEFORE.test(before)) continue;
    if (
      AREA_DISTANCE_BEFORE.test(before) &&
      !AREA_COMPARISON_BEFORE.test(before)
    )
      continue;
    const hectares = /^h/i.test(match[2]);
    const value = hectares
      ? Number(match[1].replace(/\./g, '').replace(',', '.')) * 10_000
      : Number(match[1].replace(/[.,]/g, ''));
    if (Number.isFinite(value) && value > 0) areas.push(Math.round(value));
  }
  return areas;
};

/** Área mínima que pide el cliente leída de su texto (la menor cifra de superficie que no sea un máximo). */
export const clientMinArea = (
  client: AiRecommendationClient,
): number | null => {
  const areas = areasInText(`${client.i ?? ''} ${client.n ?? ''}`, true);
  return areas.length > 0 ? Math.min(...areas) : null;
};

const SELLER_PATTERN =
  /\b(para (la )?venta|para vender|en venta|quiere vender|desea vender|busca vender|necesita vender|vende (un|una|su|sus|el|la)|esta vendiendo|vendiendo|ofrece (un|una|su)|ofrece en venta)\b/;
const BUYER_PATTERN =
  /\b(comprar|compra (un|una|de)|adquirir|invertir|inversion|busca(ndo)? (un|una|terrenos?|casas?|lotes?|departamentos?|fincas?|quintas?|propiedad(es)?)|interesad[oa] en|necesita (un|una|terreno|casa|lote))\b/;

/**
 * Cliente que solo vende (ej. "Tiene un terreno para vender en El Progreso"): no es comprador.
 * Si además expresa intención de compra ("vende su casa y busca terreno") lo decide la IA.
 */
export const isSellerOnly = (client: AiRecommendationClient): boolean => {
  const text = `${client.i ?? ''} ${client.n ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return SELLER_PATTERN.test(text) && !BUYER_PATTERN.test(text);
};

export type WantedType =
  | 'casa'
  | 'casa_terreno'
  | 'terreno'
  | 'departamento'
  | 'finca';

/**
 * Tipos de propiedad que menciona el cliente ("Interesado en una casa" → casa).
 * "casa con terreno/patio" cuenta como casa con terreno, no como terreno; "terreno para construir
 * una casa" cuenta como terreno, no como casa. Vacío = el cliente no lo dice (decide la IA).
 */
export const clientWantedTypes = (
  client: AiRecommendationClient,
): Set<WantedType> => {
  let text = ` ${client.i ?? ''} ${client.n ?? ''} `
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const wanted = new Set<WantedType>();
  // "construir una casa", "hacer su casa": es el uso del terreno, no el tipo buscado.
  text = text.replace(
    /\b(construir|construccion de|edificar|hacer|levantar)\s+(una\s+|su\s+|la\s+|mi\s+)?(casa|vivienda)s?\b/g,
    ' ',
  );
  const houseWithLand =
    /\b(casas?|viviendas?)\s+(con|y)\s+(terrenos?|patio|jardin|lotes?)\b|\bterrenos?\s+con\s+(casa|vivienda)s?\b/g;
  if (houseWithLand.test(text)) {
    wanted.add('casa_terreno');
    text = text.replace(houseWithLand, ' ');
  }
  if (/\b(casas?|viviendas?|villas?)\b/.test(text)) wanted.add('casa');
  if (/\b(terrenos?|lotes?|solar(es)?)\b/.test(text)) wanted.add('terreno');
  if (/\b(departamentos?|dptos?|suites?|apartamentos?)\b/.test(text))
    wanted.add('departamento');
  if (/\b(fincas?|quintas?|haciendas?)\b/.test(text)) wanted.add('finca');
  return wanted;
};

/** Qué buscan los clientes compatibles con cada tipo de propiedad. */
const COMPATIBLE_TYPES: Record<string, WantedType[]> = {
  terreno: ['terreno'],
  lote: ['terreno'],
  'casa y terreno': ['casa_terreno', 'casa'],
  casa: ['casa', 'casa_terreno'],
  departamento: ['departamento'],
  finca: ['finca', 'terreno'],
};

/**
 * false solo cuando el cliente dice qué tipo busca y ninguno es compatible con la propiedad
 * (busca casa y la propiedad es un terreno). Sin tipo claro, no se descarta aquí.
 */
export const isTypeCompatible = (
  propertyType: unknown,
  client: AiRecommendationClient,
): boolean => {
  const type =
    typeof propertyType === 'string' ? propertyType.toLowerCase().trim() : '';
  const accepted = COMPATIBLE_TYPES[type];
  const wanted = clientWantedTypes(client);
  if (!accepted || wanted.size === 0) return true;
  return accepted.some((t) => wanted.has(t));
};

/** Área de la propiedad que se compara con el mínimo del cliente (null = no se puede verificar). */
const propertyArea = (property: Record<string, unknown>): number | null => {
  const type =
    typeof property.tipo === 'string' ? property.tipo.toLowerCase() : '';
  const raw = LAND_TYPES.has(type)
    ? property.terreno_m2
    : type === 'departamento'
      ? property.construccion_m2
      : null;
  const area = Number(raw);
  if (raw !== null && raw !== undefined && Number.isFinite(area) && area > 0)
    return area;
  // Terreno sin terreno_m2 cargado: se toma el área escrita en características/observaciones.
  if (!LAND_TYPES.has(type)) return null;
  const text = [property.caracteristicas, property.observaciones]
    .filter((v): v is string => typeof v === 'string')
    .join(' ');
  return areasInText(text, false)[0] ?? null;
};

/**
 * Recomendador de clientes para una propiedad, directo contra OpenAI (sin n8n).
 * Una llamada por lote de clientes, salida JSON estricta y validada.
 */
@Injectable()
export class PropertyRecommendationAiService {
  private readonly logger = new Logger(PropertyRecommendationAiService.name);
  private client: OpenAI | null = null;
  private pausedUntil = 0;
  private static readonly QUOTA_PAUSE_MS = 10 * 60_000;

  constructor(
    @Inject(aiConfig.KEY)
    private readonly config: ConfigType<typeof aiConfig>,
  ) {}

  isEnabled(): boolean {
    return this.config.recommendation.enabled && Date.now() >= this.pausedUntil;
  }

  getUnavailableReason(): {
    reason: AiRecommendationFailure;
    detail: string;
  } | null {
    if (!this.config.apiKey)
      return { reason: 'disabled', detail: 'falta OPENAI_API_KEY' };
    if (!this.config.recommendation.enabled) {
      return { reason: 'disabled', detail: 'AI_RECOMMENDATION_ENABLED=false' };
    }
    if (Date.now() < this.pausedUntil)
      return { reason: 'no_credit', detail: 'OpenAI sin crédito (pausado)' };
    return null;
  }

  async recommend(
    property: Record<string, unknown>,
    clients: AiRecommendationClient[],
    learning?: AiLearningExamples,
  ): Promise<AiRecommendationResult> {
    const unavailable = this.getUnavailableReason();
    if (unavailable) return { ok: false, ...unavailable };
    // Quien solo vende o busca otro tipo de propiedad nunca se recomienda: ni se envía a la IA.
    const eligible = clients.filter(
      (c) => !isSellerOnly(c) && isTypeCompatible(property.tipo, c),
    );
    if (eligible.length < clients.length)
      this.logger.log(
        `Recomendación IA: ${clients.length - eligible.length} cliente(s) excluidos por vender o buscar otro tipo de propiedad`,
      );
    clients = eligible;
    if (clients.length === 0) return { ok: true, matches: [], calls: 0 };

    const { batchSize, minScore } = this.config.recommendation;
    const best = new Map<string, AiRecommendationMatch>();
    let calls = 0;

    const queue: AiRecommendationClient[][] = [];
    for (let start = 0; start < clients.length; start += batchSize) {
      queue.push(clients.slice(start, start + batchSize));
    }

    // Lotes secuenciales: si uno falla, falla todo (no se guarda la huella y se reintenta después).
    while (queue.length > 0) {
      const batch = queue.shift()!;

      let response: CompletionResult;
      try {
        response = await this.requestCompletion(property, batch, learning);
        calls += 1;
      } catch (error) {
        return this.toFailure(error);
      }

      // Respuesta cortada por el límite de tokens (muchas coincidencias en el lote):
      // se reintenta el lote dividido en dos en vez de fallar.
      if (response.finishReason === 'length' && batch.length > 1) {
        const half = Math.ceil(batch.length / 2);
        this.logger.warn(
          `Recomendación IA: respuesta truncada por max_completion_tokens con ${batch.length} cliente(s); se reintenta en 2 lotes de ${half} y ${batch.length - half}`,
        );
        queue.unshift(batch.slice(0, half), batch.slice(half));
        continue;
      }

      const matches = this.validate(response.output, batch, minScore, property);
      if (!matches) {
        const detail = response.refusal
          ? `la IA rechazó la solicitud: ${response.refusal}`
          : `respuesta de la IA sin el formato esperado (finish_reason=${response.finishReason ?? '?'})`;
        this.logger.warn(`Recomendación IA no interpretable: ${detail}`);
        return { ok: false, reason: 'unparseable', detail };
      }
      for (const match of matches) {
        const prev = best.get(match.client_id);
        if (!prev || match.score > prev.score) best.set(match.client_id, match);
      }
    }

    const matches = [...best.values()].sort((a, b) => b.score - a.score);
    this.logger.log(
      `Recomendación IA: ${clients.length} cliente(s) evaluado(s) en ${calls} llamada(s), ${matches.length} coincidencia(s)`,
    );
    return { ok: true, matches, calls };
  }

  /**
   * Filtra ids no enviados (inventados), aplica las reglas eliminatorias (tipo, ubicación, área,
   * preferencias, presupuesto), calcula el nivel, arma "Coincide en: …" y descarta los que quedan
   * bajo el umbral.
   */
  validate(
    output: unknown,
    batch: AiRecommendationClient[],
    minScore: number,
    property: Record<string, unknown> = {},
  ): AiRecommendationMatch[] | null {
    const list = (output as { c?: unknown } | null)?.c;
    if (!Array.isArray(list)) return null;

    const price = Number(property.precio);
    const hasPrice = Number.isFinite(price) && price > 0;
    const area = propertyArea(property);
    const clientsById = new Map(batch.map((c) => [c.id, c]));
    const matches: AiRecommendationMatch[] = [];
    let invented = 0;
    for (const item of list) {
      const raw = (item ?? {}) as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      const client = clientsById.get(id);
      if (!client) {
        if (id) invented += 1;
        continue;
      }

      const detail =
        typeof raw.r === 'string' ? raw.r.replace(/\s+/g, ' ').trim() : '';
      if (!detail) continue;

      // Reglas eliminatorias: tipo y ubicación son obligatorios; ningún requisito explícito puede fallar.
      // Solo compradores/inversionistas: quien vende, ofrece o no tiene interés propio se descarta.
      if (flag(raw.q, ['COMPRA', 'VENDE', 'OTRO'] as const) !== 'COMPRA')
        continue;
      const t = flag(raw.t, ['SI', 'NO'] as const);
      const u = flag(raw.u, ['SI', 'NO', 'ND'] as const);
      const a = flag(raw.a, ['SI', 'NO', 'ND'] as const) ?? 'ND';
      const p = flag(raw.p, ['SI', 'PARCIAL', 'NO', 'ND'] as const) ?? 'ND';
      if (t !== 'SI' || !u || u === 'NO' || a === 'NO' || p === 'NO') continue;
      // El tipo también se verifica en código: la IA a veces marca "SI" aunque diga lo contrario.
      if (!isTypeCompatible(property.tipo, client)) continue;

      const known = this.clientNumbers(client);
      let level: AiInterestLevel = 'ALTO';
      const coincide: string[] = ['tipo'];
      const notes: string[] = [];

      if (u === 'SI') coincide.push('ubicación');
      else level = minLevel(level, 'MEDIO');

      // Área: siempre verificada en código. El mínimo sale de la IA (si está en el texto del cliente)
      // o se lee directamente del texto ("mayor a 500 metros cuadrados" → 500).
      const minArea =
        this.trustedNumber(raw.am, known) ?? clientMinArea(client);
      if (minArea && area) {
        if (area < minArea * AREA_RULES.toleranceMin) continue;
        if (area < minArea) {
          level = minLevel(level, 'BAJO');
          notes.push(
            `Área ${formatM2(area)} está dentro de la tolerancia del 10 % del mínimo pedido (${formatM2(minArea)}).`,
          );
        } else {
          coincide.push('área');
        }
      } else if (minArea) {
        // Pide un área y la propiedad no la tiene registrada: no se puede afirmar que coincide.
        level = minLevel(level, 'MEDIO');
        notes.push(
          `No se pudo verificar el área (pide desde ${formatM2(minArea)}).`,
        );
      } else if (a === 'SI') {
        coincide.push('área');
      }

      if (p === 'SI') coincide.push('características');
      else if (p === 'PARCIAL') {
        level = minLevel(level, 'MEDIO');
        notes.push('Algunas características no se pueden confirmar.');
      }

      // Presupuesto: tope estricto, sin margen.
      const budget = this.trustedNumber(raw.b, known);
      if (budget && hasPrice) {
        if (price > budget) continue;
        coincide.push('precio');
      }

      const reason = [
        `Coincide en: ${coincide.join(', ')}.`,
        `${detail.replace(/[.\s]+$/, '')}.`,
        ...notes,
      ]
        .join(' ')
        .slice(0, MAX_REASON_LENGTH);

      const [bandMin, bandMax] = SCORE_BANDS[level];
      const rawScore = Math.round(Number(raw.s));
      const score = Math.max(
        bandMin,
        Math.min(bandMax, Number.isFinite(rawScore) ? rawScore : bandMin),
      );
      if (score < minScore) continue;

      matches.push({ client_id: id, interest_level: level, reason, score });
    }
    if (invented > 0)
      this.logger.warn(
        `Recomendación IA: ${invented} id(s) no enviados fueron descartados`,
      );
    return matches;
  }

  private clientNumbers(client: AiRecommendationClient): Set<string> {
    return new Set(toNumbers(`${client.i ?? ''} ${client.n ?? ''}`));
  }

  /**
   * Una cifra que dice la IA (presupuesto, área mínima) solo se acepta si aparece en el texto del
   * cliente ("hasta 25mil" → 25000 está en el texto; un número inventado no).
   */
  private trustedNumber(value: unknown, known: Set<string>): number | null {
    const n = Math.round(Number(value));
    if (value === null || value === undefined || !Number.isFinite(n) || n <= 0)
      return null;
    return known.has(String(n)) ? n : null;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey ?? undefined,
        timeout: this.config.recommendation.timeoutMs,
        maxRetries: this.config.maxRetries,
      });
    }
    return this.client;
  }

  private async requestCompletion(
    property: Record<string, unknown>,
    clients: AiRecommendationClient[],
    learning?: AiLearningExamples,
  ): Promise<CompletionResult> {
    const { model, temperature, maxOutputTokens } = this.config.recommendation;
    const completion = await this.getClient().chat.completions.create({
      model,
      temperature,
      max_completion_tokens: maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema:
          PROPERTY_RECOMMENDATION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      messages: [
        { role: 'system', content: PROPERTY_RECOMMENDATION_SYSTEM_PROMPT },
        // Aprendizaje: va después del system prompt fijo (que sigue en caché) y antes de los datos.
        ...(learning &&
        (learning.incorrectas.length > 0 || learning.correctas.length > 0)
          ? [
              {
                role: 'user' as const,
                content: JSON.stringify({ aprendizaje: learning }),
              },
            ]
          : []),
        {
          role: 'user',
          content: JSON.stringify({ propiedad: property, clientes: clients }),
        },
      ],
    });

    const usage = completion.usage;
    if (usage) {
      const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
      this.logger.debug(
        `Tokens recomendación: entrada=${usage.prompt_tokens} (cache=${cached}) salida=${usage.completion_tokens}`,
      );
    }

    const choice = completion.choices[0];
    const result: CompletionResult = {
      output: null,
      finishReason: choice?.finish_reason ?? null,
      refusal: choice?.message?.refusal ?? null,
    };
    const content = choice?.message?.content;
    if (!content) return result;
    try {
      result.output = JSON.parse(content);
    } catch {
      /* truncated or malformed JSON: output stays null */
    }
    return result;
  }

  private toFailure(error: unknown): AiRecommendationResult {
    const err = (error ?? {}) as {
      code?: string | null;
      type?: string | null;
      status?: number;
      name?: string;
    };
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Recomendación IA falló: ${detail}`);

    if (
      err.type === 'insufficient_quota' ||
      err.code === 'insufficient_quota' ||
      err.code === 'credit_balance_exhausted'
    ) {
      this.pausedUntil =
        Date.now() + PropertyRecommendationAiService.QUOTA_PAUSE_MS;
      this.logger.error(
        'OpenAI sin crédito: recomendaciones IA pausadas por 10 minutos',
      );
      return { ok: false, reason: 'no_credit', detail };
    }
    if (
      err.name === 'APIConnectionTimeoutError' ||
      /timed? ?out/i.test(detail)
    ) {
      return { ok: false, reason: 'timeout', detail };
    }
    if (typeof err.status === 'number')
      return { ok: false, reason: 'http', detail };
    return { ok: false, reason: 'network', detail };
  }
}
