import { SyncContactsService } from './sync-contacts.service';
import { GoogleToDbSyncDto } from './dto/google-to-db-sync.dto';
import { GoogleAuthCodeDto } from './dto/google-auth-code.dto';
import { GooglePreviewResponse } from './sync-contacts.service';
export declare class SyncContactsController {
    private readonly syncContactsService;
    constructor(syncContactsService: SyncContactsService);
    googleAuthUrl(): {
        authUrl: string;
    };
    googleAuthCallback(payload: GoogleAuthCodeDto): Promise<{
        hasRefreshToken: boolean;
        expiresAt: string | null;
    }>;
    googlePreview(force?: string): Promise<GooglePreviewResponse>;
    googleToDb(payload: GoogleToDbSyncDto): Promise<{
        imported: number;
        duplicatesIgnored: number;
        excludedIgnored: number;
        invalidIgnored: number;
        exclusionsStored: number;
    }>;
    dbToGoogle(): Promise<{
        synced: number;
        duplicatesIgnored: number;
        invalidIgnored: number;
    }>;
    clearExclusions(): Promise<{
        deleted: number;
    }>;
}
