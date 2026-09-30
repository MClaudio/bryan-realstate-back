import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import aiConfig from './ai.config';
import {
  PROPERTY_RECOMMENDATION_SCHEMA,
  PROPERTY_RECOMMENDATION_SYSTEM_PROMPT,
} from './prompts/property-recommendation.prompt';

export type AiInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';

export interface AiRecommendationClient {
  id: string;
  i?: string;
  n?: string;
}

export interface AiRecommendationMatch {
  client_id: string;
  interest_level: AiInterestLevel;
  reason: string;
  score: number;
}

export type AiRecommendationFailure = 'disabled' | 'no_credit' | 'timeout' | 'network' | 'http' | 'unparseable';

export type AiRecommendationResult =
  | { ok: true; matches: AiRecommendationMatch[]; calls: number }
  | { ok: false; reason: AiRecommendationFailure; detail: string };

const LEVELS: AiInterestLevel[] = ['ALTO', 'MEDIO', 'BAJO'];
const MAX_REASON_LENGTH = 300;

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

  getUnavailableReason(): { reason: AiRecommendationFailure; detail: string } | null {
    if (!this.config.apiKey) return { reason: 'disabled', detail: 'falta OPENAI_API_KEY' };
    if (!this.config.recommendation.enabled) {
      return { reason: 'disabled', detail: 'AI_RECOMMENDATION_ENABLED=false' };
    }
    if (Date.now() < this.pausedUntil) return { reason: 'no_credit', detail: 'OpenAI sin crédito (pausado)' };
    return null;
  }

  async recommend(
    property: Record<string, unknown>,
    clients: AiRecommendationClient[],
  ): Promise<AiRecommendationResult> {
    const unavailable = this.getUnavailableReason();
    if (unavailable) return { ok: false, ...unavailable };
    if (clients.length === 0) return { ok: true, matches: [], calls: 0 };

    const { batchSize, minScore } = this.config.recommendation;
    const best = new Map<string, AiRecommendationMatch>();
    let calls = 0;

    // Lotes secuenciales: si uno falla, falla todo (no se guarda la huella y se reintenta después).
    for (let start = 0; start < clients.length; start += batchSize) {
      const batch = clients.slice(start, start + batchSize);
      const allowedIds = new Set(batch.map((c) => c.id));

      let output: unknown;
      try {
        output = await this.requestCompletion(property, batch);
        calls += 1;
      } catch (error) {
        return this.toFailure(error);
      }

      const matches = this.validate(output, allowedIds, minScore);
      if (!matches) {
        return { ok: false, reason: 'unparseable', detail: 'respuesta de la IA sin el formato esperado' };
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

  /** Filtra ids no enviados (inventados), puntajes bajo el umbral y normaliza campos. */
  validate(output: unknown, allowedIds: Set<string>, minScore: number): AiRecommendationMatch[] | null {
    const list = (output as { c?: unknown } | null)?.c;
    if (!Array.isArray(list)) return null;

    const matches: AiRecommendationMatch[] = [];
    let invented = 0;
    for (const item of list) {
      const raw = (item ?? {}) as Record<string, unknown>;
      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      if (!allowedIds.has(id)) {
        if (id) invented += 1;
        continue;
      }
      const score = Math.max(0, Math.min(100, Math.round(Number(raw.s))));
      if (!Number.isFinite(score) || score < minScore) continue;

      const level = String(raw.l ?? '').toUpperCase() as AiInterestLevel;
      const reason = typeof raw.r === 'string' ? raw.r.replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_LENGTH) : '';
      if (!reason) continue;

      matches.push({
        client_id: id,
        interest_level: LEVELS.includes(level) ? level : 'MEDIO',
        reason,
        score,
      });
    }
    if (invented > 0) this.logger.warn(`Recomendación IA: ${invented} id(s) no enviados fueron descartados`);
    return matches;
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
  ): Promise<unknown> {
    const { model, temperature, maxOutputTokens } = this.config.recommendation;
    const completion = await this.getClient().chat.completions.create({
      model,
      temperature,
      max_completion_tokens: maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema: PROPERTY_RECOMMENDATION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      messages: [
        { role: 'system', content: PROPERTY_RECOMMENDATION_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ propiedad: property, clientes: clients }) },
      ],
    });

    const usage = completion.usage;
    if (usage) {
      const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
      this.logger.debug(
        `Tokens recomendación: entrada=${usage.prompt_tokens} (cache=${cached}) salida=${usage.completion_tokens}`,
      );
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private toFailure(error: unknown): AiRecommendationResult {
    const err = (error ?? {}) as { code?: string | null; type?: string | null; status?: number; name?: string };
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Recomendación IA falló: ${detail}`);

    if (err.type === 'insufficient_quota' || err.code === 'insufficient_quota' || err.code === 'credit_balance_exhausted') {
      this.pausedUntil = Date.now() + PropertyRecommendationAiService.QUOTA_PAUSE_MS;
      this.logger.error('OpenAI sin crédito: recomendaciones IA pausadas por 10 minutos');
      return { ok: false, reason: 'no_credit', detail };
    }
    if (err.name === 'APIConnectionTimeoutError' || /timed? ?out/i.test(detail)) {
      return { ok: false, reason: 'timeout', detail };
    }
    if (typeof err.status === 'number') return { ok: false, reason: 'http', detail };
    return { ok: false, reason: 'network', detail };
  }
}
