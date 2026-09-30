import { Injectable, Logger } from '@nestjs/common';

/**
 * Gasto de OpenAI del mes actual que se muestra en el header.
 *
 * OpenAI no expone el saldo de créditos por API. El gasto sólo se puede leer con una
 * Admin Key (OPENAI_ADMIN_KEY, permiso "Usage API") a través de la Costs API.
 */
export interface OpenAiUsageSummary {
  /** Hay OPENAI_API_KEY configurada (la IA está activa). */
  aiEnabled: boolean;
  /** Hay Admin Key para consultar costos. */
  billingAvailable: boolean;
  /** Gasto en USD desde `since`. */
  spentUsd: number | null;
  /** Límite de gasto mensual de la organización en USD, si OpenAI lo devuelve. */
  limitUsd: number | null;
  /** Inicio del mes actual (UTC), ISO. */
  since: string;
  fetchedAt: string;
  error: string | null;
}

interface CostsPage {
  data: Array<{ results: Array<{ amount?: { value?: number } }> }>;
  has_more: boolean;
  next_page: string | null;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const COSTS_URL = 'https://api.openai.com/v1/organization/costs';
const SPEND_LIMIT_URL = 'https://api.openai.com/v1/organization/spend_limit';

@Injectable()
export class OpenAiUsageService {
  private readonly logger = new Logger(OpenAiUsageService.name);
  private cache: { value: OpenAiUsageSummary; expiresAt: number } | null = null;

  async getSummary(): Promise<OpenAiUsageSummary> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.value;

    const value = await this.buildSummary();
    // Los errores se cachean menos tiempo para reintentar pronto.
    const ttl = value.error ? 60_000 : CACHE_TTL_MS;
    this.cache = { value, expiresAt: Date.now() + ttl };
    return value;
  }

  private async buildSummary(): Promise<OpenAiUsageSummary> {
    const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
    const adminKey = process.env.OPENAI_ADMIN_KEY?.trim() || null;
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const base: OpenAiUsageSummary = {
      aiEnabled,
      billingAvailable: Boolean(adminKey),
      spentUsd: null,
      limitUsd: null,
      since: since.toISOString(),
      fetchedAt: now.toISOString(),
      error: null,
    };

    if (!adminKey) return base;

    try {
      const [spentUsd, limitUsd] = await Promise.all([
        this.fetchCosts(adminKey, since),
        this.fetchSpendLimit(adminKey),
      ]);
      return { ...base, spentUsd, limitUsd };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo consultar el gasto de OpenAI: ${message}`);
      return { ...base, error: message };
    }
  }

  private async fetchCosts(adminKey: string, since: Date): Promise<number> {
    const startTime = Math.floor(since.getTime() / 1000);
    let page: string | null = null;
    let total = 0;

    // Buckets diarios; un mes cabe en una página, pero se sigue la paginación por si acaso.
    for (let i = 0; i < 10; i++) {
      const params = new URLSearchParams({
        start_time: String(startTime),
        bucket_width: '1d',
        limit: '31',
      });
      if (page) params.set('page', page);

      const res = await fetch(`${COSTS_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenAI Costs API ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as CostsPage;
      for (const bucket of json.data ?? []) {
        for (const result of bucket.results ?? []) {
          total += Number(result.amount?.value ?? 0);
        }
      }

      if (!json.has_more || !json.next_page) break;
      page = json.next_page;
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Límite mensual de gasto (Settings > Limits). OpenAI documenta el POST de este
   * endpoint pero no el GET, así que se lee de forma tolerante: si falla o no trae
   * `threshold_amount` (en centavos) se devuelve null y sólo se muestra el gasto.
   */
  private async fetchSpendLimit(adminKey: string): Promise<number | null> {
    try {
      const res = await fetch(SPEND_LIMIT_URL, {
        headers: { Authorization: `Bearer ${adminKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.debug(`Spend limit no disponible (${res.status})`);
        return null;
      }
      const json = (await res.json()) as Record<string, unknown>;
      const candidate = (Array.isArray(json.data) ? json.data[0] : json.data ?? json) as
        | { threshold_amount?: unknown }
        | undefined;
      const cents = Number(candidate?.threshold_amount);
      return Number.isFinite(cents) && cents > 0 ? cents / 100 : null;
    } catch {
      return null;
    }
  }
}
