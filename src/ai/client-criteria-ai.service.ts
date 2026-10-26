import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import aiConfig from './ai.config';
import {
  CLIENT_CRITERIA_SCHEMA,
  CLIENT_CRITERIA_SYSTEM_PROMPT,
} from './prompts/client-criteria.prompt';

export interface CriteriaAiInput {
  id: string;
  texto: string;
  /** Lo que ya leyeron las reglas. */
  reglas: unknown;
  /** Lo que las reglas no pudieron resolver. */
  dudas: string[];
}

export type CriteriaAiResult =
  | { ok: true; items: Map<string, Record<string, unknown>>; calls: number }
  | { ok: false; detail: string };

/**
 * Interpreta con IA los intereses de clientes que las reglas no pudieron leer con seguridad.
 * No decide recomendaciones: solo devuelve criterios en bruto que el backend valida.
 */
@Injectable()
export class ClientCriteriaAiService {
  private readonly logger = new Logger(ClientCriteriaAiService.name);
  private client: OpenAI | null = null;
  private pausedUntil = 0;
  private static readonly QUOTA_PAUSE_MS = 10 * 60_000;

  constructor(
    @Inject(aiConfig.KEY)
    private readonly config: ConfigType<typeof aiConfig>,
  ) {}

  isEnabled(): boolean {
    return this.config.criteria.enabled && Date.now() >= this.pausedUntil;
  }

  /** Huella del prompt y del esquema: si cambian, se vuelven a extraer los criterios. */
  promptSignature(): string {
    return `${this.config.criteria.model}|${CLIENT_CRITERIA_SYSTEM_PROMPT}|${JSON.stringify(CLIENT_CRITERIA_SCHEMA)}`;
  }

  async extract(
    inputs: CriteriaAiInput[],
    context: { cities: string[]; sectors: string[] },
  ): Promise<CriteriaAiResult> {
    if (!this.isEnabled())
      return { ok: false, detail: 'IA de criterios desactivada o sin crédito' };
    const items = new Map<string, Record<string, unknown>>();
    let calls = 0;
    const { batchSize } = this.config.criteria;
    for (let start = 0; start < inputs.length; start += batchSize) {
      const batch = inputs.slice(start, start + batchSize);
      try {
        const output = await this.request(batch, context);
        calls += 1;
        for (const item of output) {
          const id = typeof item.id === 'string' ? item.id : '';
          if (batch.some((b) => b.id === id)) items.set(id, item);
        }
      } catch (error) {
        return { ok: false, detail: this.describeError(error) };
      }
    }
    this.logger.log(
      `Criterios IA: ${inputs.length} cliente(s) interpretado(s) en ${calls} llamada(s)`,
    );
    return { ok: true, items, calls };
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey ?? undefined,
        timeout: this.config.criteria.timeoutMs,
        maxRetries: this.config.maxRetries,
      });
    }
    return this.client;
  }

  private async request(
    batch: CriteriaAiInput[],
    context: { cities: string[]; sectors: string[] },
  ): Promise<Array<Record<string, unknown>>> {
    const { model, temperature, maxOutputTokens } = this.config.criteria;
    const completion = await this.getClient().chat.completions.create({
      model,
      temperature,
      max_completion_tokens: maxOutputTokens,
      response_format: {
        type: 'json_schema',
        json_schema:
          CLIENT_CRITERIA_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      messages: [
        { role: 'system', content: CLIENT_CRITERIA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            ciudades: context.cities,
            sectores: context.sectors,
            clientes: batch,
          }),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('respuesta vacía de la IA');
    const parsed = JSON.parse(content) as { c?: unknown };
    if (!Array.isArray(parsed.c))
      throw new Error('respuesta de la IA sin el formato esperado');
    return parsed.c as Array<Record<string, unknown>>;
  }

  private describeError(error: unknown): string {
    const err = (error ?? {}) as { code?: string | null; type?: string | null };
    const detail = error instanceof Error ? error.message : String(error);
    if (
      err.type === 'insufficient_quota' ||
      err.code === 'insufficient_quota' ||
      err.code === 'credit_balance_exhausted'
    ) {
      this.pausedUntil = Date.now() + ClientCriteriaAiService.QUOTA_PAUSE_MS;
      this.logger.error(
        'OpenAI sin crédito: criterios IA pausados por 10 minutos',
      );
    }
    this.logger.warn(`Criterios IA fallaron: ${detail}`);
    return detail;
  }
}
