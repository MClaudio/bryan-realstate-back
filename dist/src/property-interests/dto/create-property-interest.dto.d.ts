import { InterestLevel } from '@prisma/client';
export declare class CreatePropertyInterestDto {
    propertyId: string;
    clientId: string;
    interestDate: string;
    interestLevel: InterestLevel;
    notes?: string;
}
