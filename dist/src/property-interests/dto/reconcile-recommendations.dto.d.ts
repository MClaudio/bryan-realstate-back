import { InterestLevel } from '@prisma/client';
export declare class ReconcileInterestItemDto {
    clientId: string;
    interestLevel?: InterestLevel;
    interest_level?: string;
    reason?: string;
    notes?: string;
    interestDate?: string;
}
export declare class ReconcileRecommendationsDto {
    recommendations: ReconcileInterestItemDto[];
}
