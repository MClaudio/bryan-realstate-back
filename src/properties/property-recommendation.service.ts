import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export type RecommendedInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';

export interface RecommendedCandidate {
  client_id: string;
  name: string;
  interest_level: RecommendedInterestLevel;
  reason: string;
  score?: number;
}

interface RecommendationResponse {
  candidates?: RecommendedCandidate[];
  output?: unknown;
}

type CandidateLike = Partial<RecommendedCandidate>;

@Injectable()
export class PropertyRecommendationService {
  private readonly logger = new Logger(PropertyRecommendationService.name);

  constructor(private readonly configService: ConfigService) {}

  async recommendCandidates(
    property: unknown,
  ): Promise<RecommendedCandidate[]> {
    const endpointBase = this.configService.get<string>('N8N_RECOMMENDER_URL');
    const endpoint = endpointBase
      ? `${endpointBase.replace(/\/$/, '')}/agent-http-router`
      : undefined;
    const jwtSecret = this.configService.get<string>('N8N_JWT_SECRET');
    const jwtAlgorithm = this.configService.get<string>('N8N_JWT_ALGORITHM') || 'HS256';
    const jwtExpiresIn =
      this.configService.get<string>('N8N_JWT_EXPIRES_IN') || '3600';
    const timeoutMs = Number(
      this.configService.get<string>('N8N_RECOMMENDER_TIMEOUT_MS') ?? '12000',
    );

    if (!endpoint || !jwtSecret) {
      this.logger.warn(
        'N8N recommender disabled because N8N_RECOMMENDER_URL or N8N_JWT_SECRET is missing',
      );
      return [];
    }

    try {
      // Generate JWT token
      const signOptions: jwt.SignOptions = {
        algorithm: jwtAlgorithm as jwt.Algorithm,
      };

      // Only add expiresIn if it has a value
      if (jwtExpiresIn && jwtExpiresIn.trim() !== '') {
        signOptions.expiresIn = parseInt(jwtExpiresIn, 10);
      }

      const jwtToken = jwt.sign(
        { timestamp: Date.now(), type: 'property-recommendation' },
        jwtSecret,
        signOptions,
      );

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(property),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(
          `N8N recommender returned ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const payload = (await response.json()) as RecommendationResponse;
      const candidates = this.extractCandidates(payload);

      if (!Array.isArray(candidates)) {
        return [];
      }

      return candidates
        .map((candidate) => ({
          client_id: String((candidate as CandidateLike)?.client_id ?? ''),
          name: String((candidate as CandidateLike)?.name ?? '').trim(),
          interest_level: this.normalizeLevel(
            (candidate as CandidateLike)?.interest_level,
          ),
          reason: String((candidate as CandidateLike)?.reason ?? '').trim(),
          score:
            (candidate as CandidateLike)?.score !== undefined &&
            !Number.isNaN(Number((candidate as CandidateLike).score))
              ? Number((candidate as CandidateLike).score)
              : undefined,
        }))
        .filter(
          (candidate) =>
            candidate.client_id && candidate.name && candidate.reason,
        );
    } catch (error) {
      this.logger.error(
        `Error calling N8N recommender: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private normalizeLevel(level: unknown): RecommendedInterestLevel {
    const raw = typeof level === 'string' ? level.toUpperCase() : '';
    if (raw === 'ALTO') return 'ALTO';
    if (raw === 'BAJO') return 'BAJO';
    return 'MEDIO';
  }

  private extractCandidates(
    payload: RecommendationResponse,
  ): unknown[] | undefined {
    if (Array.isArray(payload?.candidates)) {
      return payload.candidates;
    }

    if (typeof payload?.output === 'string') {
      try {
        const parsed = JSON.parse(payload.output) as RecommendationResponse;
        if (Array.isArray(parsed?.candidates)) {
          return parsed.candidates;
        }
      } catch {
        return undefined;
      }
    }

    if (
      payload?.output &&
      typeof payload.output === 'object' &&
      Array.isArray((payload.output as RecommendationResponse).candidates)
    ) {
      return (payload.output as RecommendationResponse).candidates;
    }

    return undefined;
  }
}
