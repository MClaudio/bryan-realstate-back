"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleContactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleContactsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const googleapis_1 = require("googleapis");
const contact_normalization_1 = require("../sync-contacts/utils/contact-normalization");
const phoneFormatter_1 = require("../utils/phoneFormatter");
let GoogleContactsService = GoogleContactsService_1 = class GoogleContactsService {
    prisma;
    configService;
    logger = new common_1.Logger(GoogleContactsService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    getAuthorizationUrl() {
        const client = this.createOAuthClient();
        const scopeConfig = this.configService.get('GOOGLE_SCOPE') ?? 'https://www.googleapis.com/auth/contacts';
        const scopes = scopeConfig
            .split(/[\s,]+/)
            .map((scope) => scope.trim())
            .filter(Boolean);
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: scopes,
        });
    }
    async exchangeCodeForTokens(code) {
        const client = this.createOAuthClient();
        const { tokens } = await client.getToken(code);
        if (!tokens.access_token) {
            throw new common_1.BadRequestException('No se pudo obtener access_token de Google');
        }
        await this.persistTokens(tokens);
        return {
            hasRefreshToken: Boolean(tokens.refresh_token),
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        };
    }
    async listAllContacts() {
        const people = await this.getPeopleClient();
        const contacts = [];
        let pageToken;
        do {
            const response = await this.withRetry(() => people.people.connections.list({
                resourceName: 'people/me',
                personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata',
                pageSize: 1000,
                pageToken,
                sortOrder: 'FIRST_NAME_ASCENDING',
            }));
            const connections = response.data.connections ?? [];
            for (const person of connections) {
                contacts.push(this.mapPerson(person));
            }
            pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);
        return contacts;
    }
    async findDuplicateContactByEmailOrPhone(email, phone) {
        const normalizedEmail = (0, contact_normalization_1.normalizeEmail)(email);
        const normalizedPhone = (0, contact_normalization_1.normalizePhone)(phone);
        if (!normalizedEmail && !normalizedPhone) {
            return null;
        }
        const people = await this.getPeopleClient();
        const queries = [normalizedEmail, normalizedPhone].filter(Boolean);
        for (const query of queries) {
            const response = await this.withRetry(() => people.people.searchContacts({
                query,
                readMask: 'names,emailAddresses,phoneNumbers,biographies,metadata',
                pageSize: 30,
            }));
            const results = response.data.results ?? [];
            const exactMatch = results.find((result) => {
                const person = result.person;
                if (!person)
                    return false;
                const personEmail = (0, contact_normalization_1.normalizeEmail)(person.emailAddresses?.[0]?.value ?? null);
                const personPhone = (0, contact_normalization_1.normalizePhone)(person.phoneNumbers?.[0]?.value ?? null);
                if (normalizedEmail && personEmail === normalizedEmail)
                    return true;
                if (normalizedPhone && personPhone === normalizedPhone)
                    return true;
                return false;
            });
            if (exactMatch?.person) {
                return this.mapPerson(exactMatch.person);
            }
        }
        return null;
    }
    async createContact(contact) {
        const people = await this.getPeopleClient();
        const firstName = contact.firstName?.trim() || 'Sin';
        const lastName = contact.lastName?.trim() || 'Nombre';
        const email = (0, contact_normalization_1.normalizeEmail)(contact.email);
        const rawPhone = contact.phone?.trim() ?? null;
        const phone = rawPhone
            ? (() => {
                const { formatted, isValid } = (0, phoneFormatter_1.formatPhoneNumber)(rawPhone);
                return isValid ? formatted : null;
            })()
            : null;
        const created = await this.withRetry(() => people.people.createContact({
            requestBody: {
                names: [
                    {
                        givenName: firstName,
                        familyName: lastName,
                        displayName: `${firstName} ${lastName}`.trim(),
                    },
                ],
                emailAddresses: email ? [{ value: email }] : undefined,
                phoneNumbers: phone ? [{ value: phone }] : undefined,
                biographies: contact.biography ? [{ value: contact.biography, contentType: 'TEXT_PLAIN' }] : undefined,
            },
        }));
        return this.mapPerson(created.data);
    }
    async updateContact(googleContactId, contact) {
        const people = await this.getPeopleClient();
        const current = await this.withRetry(() => people.people.get({
            resourceName: googleContactId,
            personFields: 'names,emailAddresses,phoneNumbers,biographies,metadata',
        }));
        const etag = current.data.etag;
        const firstName = contact.firstName?.trim() || 'Sin';
        const lastName = contact.lastName?.trim() || 'Nombre';
        const email = (0, contact_normalization_1.normalizeEmail)(contact.email);
        const rawPhone = contact.phone?.trim() ?? null;
        const phone = rawPhone
            ? (() => {
                const { formatted, isValid } = (0, phoneFormatter_1.formatPhoneNumber)(rawPhone);
                return isValid ? formatted : null;
            })()
            : null;
        const updated = await this.withRetry(() => people.people.updateContact({
            resourceName: googleContactId,
            updatePersonFields: 'names,emailAddresses,phoneNumbers,biographies',
            requestBody: {
                etag,
                names: [
                    {
                        givenName: firstName,
                        familyName: lastName,
                        displayName: `${firstName} ${lastName}`.trim(),
                    },
                ],
                emailAddresses: email ? [{ value: email }] : [],
                phoneNumbers: phone ? [{ value: phone }] : [],
                biographies: contact.biography ? [{ value: contact.biography, contentType: 'TEXT_PLAIN' }] : [],
            },
        }));
        return this.mapPerson(updated.data);
    }
    async getPeopleClient() {
        const oauthClient = await this.getAuthorizedClient();
        return googleapis_1.google.people({ version: 'v1', auth: oauthClient });
    }
    createOAuthClient() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI');
        if (!clientId || !clientSecret || !redirectUri) {
            throw new common_1.BadRequestException('Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI en variables de entorno');
        }
        return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }
    async getAuthorizedClient() {
        const oauthClient = this.createOAuthClient();
        const token = await this.prisma.googleAuthToken.findUnique({
            where: { provider: 'google' },
        });
        if (!token) {
            throw new common_1.BadRequestException('Google no está conectado. Autoriza la aplicación primero.');
        }
        oauthClient.setCredentials({
            access_token: token.accessToken,
            refresh_token: token.refreshToken ?? undefined,
            expiry_date: token.expiryDate ? token.expiryDate.getTime() : undefined,
            token_type: token.tokenType ?? undefined,
            scope: token.scope ?? undefined,
        });
        oauthClient.on('tokens', (tokens) => {
            void this.persistTokens(tokens).catch((error) => {
                this.logger.error('No se pudieron persistir tokens renovados de Google', error);
            });
        });
        const isExpired = token.expiryDate ? token.expiryDate.getTime() <= Date.now() : false;
        if (isExpired && token.refreshToken) {
            const { credentials } = await oauthClient.refreshAccessToken();
            await this.persistTokens(credentials);
            oauthClient.setCredentials(credentials);
        }
        return oauthClient;
    }
    async persistTokens(tokens) {
        const existing = await this.prisma.googleAuthToken.findUnique({
            where: { provider: 'google' },
        });
        const accessToken = tokens.access_token ?? existing?.accessToken;
        if (!accessToken) {
            throw new common_1.BadRequestException('No se pudo persistir token de Google sin access_token');
        }
        await this.prisma.googleAuthToken.upsert({
            where: { provider: 'google' },
            create: {
                provider: 'google',
                accessToken,
                refreshToken: tokens.refresh_token ?? null,
                tokenType: tokens.token_type ?? null,
                scope: tokens.scope ?? null,
                expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            },
            update: {
                accessToken,
                refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
                tokenType: tokens.token_type ?? existing?.tokenType ?? null,
                scope: tokens.scope ?? existing?.scope ?? null,
                expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existing?.expiryDate ?? null,
            },
        });
    }
    mapPerson(person) {
        const firstName = person.names?.[0]?.givenName ?? null;
        const lastName = person.names?.[0]?.familyName ?? null;
        const fullName = person.names?.[0]?.displayName ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || null);
        const rawPhone = person.phoneNumbers?.[0]?.value?.trim() || null;
        return {
            googleContactId: person.resourceName ?? null,
            firstName,
            lastName,
            fullName,
            email: (0, contact_normalization_1.normalizeEmail)(person.emailAddresses?.[0]?.value ?? null),
            phone: rawPhone,
            biography: person.biographies?.[0]?.value?.trim() || null,
        };
    }
    async withRetry(callback, maxAttempts = 3) {
        let currentError;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await callback();
            }
            catch (error) {
                currentError = error;
                const status = error?.code ??
                    error?.response?.status;
                const shouldRetry = status === 429 || status === 500 || status === 502 || status === 503;
                if (!shouldRetry || attempt === maxAttempts) {
                    throw error;
                }
                const backoffMs = 250 * 2 ** (attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
        throw currentError;
    }
};
exports.GoogleContactsService = GoogleContactsService;
exports.GoogleContactsService = GoogleContactsService = GoogleContactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], GoogleContactsService);
//# sourceMappingURL=google-contacts.service.js.map