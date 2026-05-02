import { OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleContactsService } from '../google-contacts/google-contacts.service';
import { ExclusionService } from './exclusion.service';
import { ConfigService } from '@nestjs/config';
import { GoogleToDbSyncDto } from './dto/google-to-db-sync.dto';
export interface PreviewCandidate {
    candidateId: string;
    googleContactId: string | null;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    biography: string | null;
}
export interface GooglePreviewResponse {
    contacts: PreviewCandidate[];
    summary: {
        totalFromGoogle: number;
        candidates: number;
        skippedWithoutIdentifier: number;
        skippedWithoutPhone: number;
        skippedDuplicates: number;
        skippedExcluded: number;
    };
    lastSyncAt: Date | null;
}
export declare class SyncContactsService implements OnModuleInit {
    private readonly prisma;
    private readonly googleContactsService;
    private readonly exclusionService;
    private readonly configService;
    private readonly schedulerRegistry;
    private readonly logger;
    private readonly cronJobName;
    constructor(prisma: PrismaService, googleContactsService: GoogleContactsService, exclusionService: ExclusionService, configService: ConfigService, schedulerRegistry: SchedulerRegistry);
    onModuleInit(): void;
    getGoogleAuthUrl(): {
        authUrl: string;
    };
    exchangeGoogleAuthCode(code: string): Promise<{
        hasRefreshToken: boolean;
        expiresAt: string | null;
    }>;
    clearExclusions(): Promise<{
        deleted: number;
    }>;
    updateClientInGoogle(client: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
        googleContactId: string;
        interestDescription?: string | null;
    }): Promise<{
        updated: boolean;
        reason?: undefined;
    } | {
        updated: boolean;
        reason: string;
    }>;
    syncClientToGoogle(client: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
        interestDescription?: string | null;
        googleContactId?: string | null;
    }): Promise<{
        synced: boolean;
        reason: string;
    } | {
        synced: boolean;
        reason?: undefined;
    }>;
    getGooglePreview(forceSync?: boolean, includeExisting?: boolean): Promise<GooglePreviewResponse>;
    syncGoogleToDb(payload: GoogleToDbSyncDto): Promise<{
        imported: number;
        duplicatesIgnored: number;
        excludedIgnored: number;
        invalidIgnored: number;
        exclusionsStored: number;
    }>;
    syncDbToGoogle(): Promise<{
        synced: number;
        duplicatesIgnored: number;
        invalidIgnored: number;
    }>;
    syncGoogleToDbCron(): Promise<void>;
    private buildExistingClientIndex;
}
