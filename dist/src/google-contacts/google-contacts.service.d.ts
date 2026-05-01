import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface GoogleContactPayload {
    googleContactId?: string | null;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    biography?: string | null;
}
export declare class GoogleContactsService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    getAuthorizationUrl(): string;
    exchangeCodeForTokens(code: string): Promise<{
        hasRefreshToken: boolean;
        expiresAt: string | null;
    }>;
    listAllContacts(): Promise<GoogleContactPayload[]>;
    findDuplicateContactByEmailOrPhone(email?: string | null, phone?: string | null): Promise<GoogleContactPayload | null>;
    createContact(contact: GoogleContactPayload): Promise<GoogleContactPayload>;
    updateContact(googleContactId: string, contact: GoogleContactPayload): Promise<GoogleContactPayload>;
    private getPeopleClient;
    private createOAuthClient;
    private getAuthorizedClient;
    private persistTokens;
    private mapPerson;
    private withRetry;
}
