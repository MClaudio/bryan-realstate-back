import { ProcessType } from '@prisma/client';
export declare class ExpenseDto {
    amount: number;
    description: string;
}
export declare class CreateProcessDto {
    propertyId: string;
    title: string;
    type: ProcessType;
    description: string;
    expenses?: ExpenseDto[];
    fileIds?: string[];
    approximateTime?: string;
    nextStep?: string;
}
