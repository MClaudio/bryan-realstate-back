import { ConfigService } from '@nestjs/config';
export type RecommendedInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';
export interface RecommendedCandidate {
    client_id: string;
    name: string;
    interest_level: RecommendedInterestLevel;
    reason: string;
    score?: number;
}
export declare class PropertyRecommendationService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    recommendCandidates(property: unknown): Promise<RecommendedCandidate[]>;
    private normalizeLevel;
    private extractCandidates;
}
