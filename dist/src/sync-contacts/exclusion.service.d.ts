import { PrismaService } from '../prisma/prisma.service';
import { GoogleContactSelectionDto } from './dto/google-contact-selection.dto';
export interface ExclusionIndex {
    googleIds: Set<string>;
    candidateIds: Set<string>;
}
export declare class ExclusionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getExclusionIndex(): Promise<ExclusionIndex>;
    isExcluded(contact: {
        googleContactId?: string | null;
        candidateId?: string | null;
    }, exclusionIndex: ExclusionIndex): boolean;
    storeExclusions(contacts: GoogleContactSelectionDto[], reason?: string): Promise<{
        stored: number;
    }>;
}
