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

const LEVELS: AiInterestLevel[] = ['ALTO', 'MEDIO', 'BAJO'];
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
const MAX_REASON_LENGTH = 300;

/**
 * Regla de presupuesto aplicada en código (no se confía en que el modelo haga la cuenta).
 * ratio = precio / presupuesto del cliente.
 */
export const BUDGET_RULES = {
  /** Hasta 10 % por encima: sin penalización. */
  noPenaltyMax: 1.1,
  /** Hasta 30 % por encima: como máximo MEDIO. Por encima: BAJO. */
  mediumMax: 1.3,
  /** Más del doble: no se recomienda. */
  excludeAbove: 2,
} as const;

const formatUsd = (value: number) =>
  `$${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const minLevel = (a: AiInterestLevel, b: AiInterestLevel): AiInterestLevel =>
  LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;

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
    if (clients.length === 0) return { ok: true, matches: [], calls: 0 };

    const { batchSize, minScore } = this.config.recommendation;
    const price = Number(property.precio);
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

      const matches = this.validate(response.output, batch, minScore, price);
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
   * Filtra ids no enviados (inventados), aplica la regla de presupuesto, ajusta el puntaje al nivel
   * y descarta los que quedan bajo el umbral.
   */
  validate(
    output: unknown,
    batch: AiRecommendationClient[],
    minScore: number,
    price?: number,
  ): AiRecommendationMatch[] | null {
    const list = (output as { c?: unknown } | null)?.c;
    if (!Array.isArray(list)) return null;

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

      let reason =
        typeof raw.r === 'string'
          ? raw.r.replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_LENGTH)
          : '';
      if (!reason) continue;

      const rawLevel = String(raw.l ?? '').toUpperCase() as AiInterestLevel;
      let level: AiInterestLevel = LEVELS.includes(rawLevel)
        ? rawLevel
        : 'MEDIO';

      const budget = this.trustedBudget(raw.b, client);
      if (budget && price && Number.isFinite(price) && price > 0) {
        const ratio = price / budget;
        if (ratio > BUDGET_RULES.excludeAbove) continue;
        const cap: AiInterestLevel =
          ratio > BUDGET_RULES.mediumMax
            ? 'BAJO'
            : ratio > BUDGET_RULES.noPenaltyMax
              ? 'MEDIO'
              : 'ALTO';
        if (LEVEL_RANK[cap] < LEVEL_RANK[level]) {
          level = minLevel(level, cap);
          const note = `Precio ${formatUsd(price)} supera su presupuesto de ${formatUsd(budget)}.`;
          reason = `${reason.replace(/[.\s]+$/, '')}. ${note}`.slice(
            0,
            MAX_REASON_LENGTH,
          );
        }
      }

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

  /**
   * El presupuesto que dice la IA solo se acepta si esa cifra aparece en el texto del cliente
   * ("hasta 25mil" → 25000 está en el texto; un número inventado no).
   */
  private trustedBudget(
    value: unknown,
    client: AiRecommendationClient,
  ): number | null {
    const budget = Math.round(Number(value));
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(budget) ||
      budget <= 0
    )
      return null;
    const known = new Set(toNumbers(`${client.i ?? ''} ${client.n ?? ''}`));
    return known.has(String(budget)) ? budget : null;
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
