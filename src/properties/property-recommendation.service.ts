import { Injectable } from '@nestjs/common';
import {
  AiRecommendationClient,
  PropertyRecommendationAiService,
} from '../ai/property-recommendation-ai.service';

export type RecommendedInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';

export interface RecommendedCandidate {
  client_id: string;
  name: string;
  interest_level: RecommendedInterestLevel;
  reason: string;
  score?: number;
}

export type RecommenderFailure =
  | 'disabled'
  | 'no_credit'
  | 'timeout'
  | 'http'
  | 'network'
  | 'unparseable';

/**
 * A failed call must never be confused with "the AI found nobody": callers
 * reconcile the interested-clients list only when `ok` is true.
 * `name` comes back empty: the runner fills it from the DB (names are not sent to the AI).
 */
export type RecommendationResult =
  | { ok: true; candidates: RecommendedCandidate[]; calls: number }
  | { ok: false; reason: RecommenderFailure; detail: string };

const FAILURE_LABELS: Record<RecommenderFailure, string> = {
  disabled: 'el recomendador IA está desactivado o falta OPENAI_API_KEY',
  no_credit: 'la cuenta de OpenAI no tiene crédito',
  timeout: 'la IA tardó demasiado en responder',
  http: 'el servicio de IA respondió con error',
  network: 'no se pudo contactar al servicio de IA',
  unparseable: 'la respuesta de la IA no tiene el formato esperado',
};

export const describeRecommenderFailure = (reason: RecommenderFailure) =>
  FAILURE_LABELS[reason];

/**
 * Recomienda clientes para una propiedad directamente con OpenAI
 * (antes pasaba por el webhook de n8n `agent-http-router`).
 */
@Injectable()
export class PropertyRecommendationService {
  constructor(private readonly ai: PropertyRecommendationAiService) {}

  async recommendCandidates(input: {
    property: Record<string, unknown>;
    clients: AiRecommendationClient[];
  }): Promise<RecommendationResult> {
    const result = await this.ai.recommend(input.property, input.clients);
    if (!result.ok) return result;

    return {
      ok: true,
      calls: result.calls,
      candidates: result.matches.map((m) => ({
        client_id: m.client_id,
        name: '',
        interest_level: m.interest_level,
        reason: m.reason,
        score: m.score,
      })),
    };
  }
}
