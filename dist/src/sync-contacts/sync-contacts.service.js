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
var SyncContactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncContactsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const google_contacts_service_1 = require("../google-contacts/google-contacts.service");
const exclusion_service_1 = require("./exclusion.service");
const config_1 = require("@nestjs/config");
const cron_1 = require("cron");
const contact_normalization_1 = require("./utils/contact-normalization");
const phoneFormatter_1 = require("../utils/phoneFormatter");
let SyncContactsService = SyncContactsService_1 = class SyncContactsService {
    prisma;
    googleContactsService;
    exclusionService;
    configService;
    schedulerRegistry;
    logger = new common_1.Logger(SyncContactsService_1.name);
    cronJobName = 'google-contacts-to-db-sync';
    constructor(prisma, googleContactsService, exclusionService, configService, schedulerRegistry) {
        this.prisma = prisma;
        this.googleContactsService = googleContactsService;
        this.exclusionService = exclusionService;
        this.configService = configService;
        this.schedulerRegistry = schedulerRegistry;
    }
    onModuleInit() {
        const cronExpression = this.configService.get('CONTACTS_SYNC_CRON') ?? '0 */6 * * *';
        const timezone = this.configService.get('TZ') ?? 'America/Guayaquil';
        if (this.schedulerRegistry.doesExist('cron', this.cronJobName)) {
            this.schedulerRegistry.deleteCronJob(this.cronJobName);
        }
        const job = new cron_1.CronJob(cronExpression, () => {
            void this.syncGoogleToDbCron();
        }, null, false, timezone);
        this.schedulerRegistry.addCronJob(this.cronJobName, job);
        job.start();
        this.logger.log(`Cron job '${this.cronJobName}' started with expression '${cronExpression}' (TZ=${timezone})`);
    }
    getGoogleAuthUrl() {
        return {
            authUrl: this.googleContactsService.getAuthorizationUrl(),
        };
    }
    exchangeGoogleAuthCode(code) {
        return this.googleContactsService.exchangeCodeForTokens(code);
    }
    async clearExclusions() {
        const result = await this.prisma.contactSyncExclusion.deleteMany({});
        return { deleted: result.count };
    }
    async updateClientInGoogle(client) {
        try {
            await this.googleContactsService.updateContact(client.googleContactId, {
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                phone: client.phone,
                biography: client.interestDescription ?? null,
            });
            await this.prisma.client.update({
                where: { id: client.id },
                data: { googleSyncedAt: new Date() },
            });
            return { updated: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Update db->google failed for client ${client.id}: ${message}`);
            return { updated: false, reason: message };
        }
    }
    async syncClientToGoogle(client) {
        const email = (0, contact_normalization_1.normalizeEmail)(client.email);
        const phone = (0, contact_normalization_1.normalizePhone)(client.phone);
        if (!email && !phone) {
            return { synced: false, reason: 'Client without email or phone' };
        }
        try {
            const duplicate = await this.googleContactsService.findDuplicateContactByEmailOrPhone(email, phone);
            if (duplicate?.googleContactId) {
                await this.prisma.client.update({
                    where: { id: client.id },
                    data: {
                        googleContactId: duplicate.googleContactId,
                        googleSyncedAt: new Date(),
                    },
                });
                return { synced: false, reason: 'Duplicate in Google detected' };
            }
            const created = await this.googleContactsService.createContact({
                firstName: client.firstName,
                lastName: client.lastName,
                email,
                phone,
                biography: client.interestDescription ?? null,
            });
            await this.prisma.client.update({
                where: { id: client.id },
                data: {
                    googleContactId: created.googleContactId ?? null,
                    googleSyncedAt: new Date(),
                },
            });
            return { synced: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Auto sync db->google failed for client ${client.id}: ${message}`);
            return { synced: false, reason: message };
        }
    }
    async getGooglePreview(forceSync = false, includeExisting = false) {
        const [googleContacts, exclusionIndex, existingIndex] = await Promise.all([
            this.googleContactsService.listAllContacts(),
            this.exclusionService.getExclusionIndex(),
            this.buildExistingClientIndex(),
        ]);
        const candidates = [];
        const seenInGoogle = new Set();
        let skippedWithoutIdentifier = 0;
        let skippedWithoutPhone = 0;
        let skippedDuplicates = 0;
        let skippedExcluded = 0;
        for (const googleContact of googleContacts) {
            const normalizedEmail = (0, contact_normalization_1.normalizeEmail)(googleContact.email);
            const phoneInput = googleContact.phone ?? '';
            const { formatted: formattedPhone, isValid: isValidPhone } = (0, phoneFormatter_1.formatPhoneNumber)(phoneInput);
            const normalizedPhone = isValidPhone ? (0, contact_normalization_1.normalizePhone)(formattedPhone) : null;
            if (!normalizedEmail && !normalizedPhone) {
                skippedWithoutIdentifier += 1;
                continue;
            }
            const uniqueKey = (0, contact_normalization_1.getContactUniqueKey)(normalizedEmail, normalizedPhone) ??
                googleContact.googleContactId ??
                `${googleContact.fullName ?? 'sin-nombre'}-${candidates.length}`;
            const candidateId = (0, contact_normalization_1.buildCandidateId)({
                googleContactId: googleContact.googleContactId,
                email: normalizedEmail,
                phone: normalizedPhone,
            }) ?? `tmp:${candidates.length}`;
            if (seenInGoogle.has(candidateId)) {
                skippedDuplicates += 1;
                continue;
            }
            seenInGoogle.add(candidateId);
            const existsInDb = (googleContact.googleContactId && existingIndex.googleIds.has(googleContact.googleContactId)) ||
                (normalizedEmail && existingIndex.emails.has(normalizedEmail)) ||
                (normalizedPhone && existingIndex.phones.has(normalizedPhone));
            if (existsInDb && !includeExisting) {
                skippedDuplicates += 1;
                continue;
            }
            if (!forceSync &&
                this.exclusionService.isExcluded({ googleContactId: googleContact.googleContactId, candidateId }, exclusionIndex)) {
                skippedExcluded += 1;
                continue;
            }
            if (!isValidPhone || !normalizedPhone) {
                skippedWithoutPhone += 1;
                continue;
            }
            const firstName = googleContact.firstName?.trim() || (0, contact_normalization_1.splitFullName)(googleContact.fullName).firstName;
            const lastName = googleContact.lastName?.trim() || (0, contact_normalization_1.splitFullName)(googleContact.fullName).lastName;
            const fullName = googleContact.fullName?.trim() || `${firstName} ${lastName}`.trim();
            candidates.push({
                candidateId,
                googleContactId: googleContact.googleContactId ?? null,
                firstName,
                lastName,
                fullName,
                email: normalizedEmail,
                phone: formattedPhone,
                biography: googleContact.biography ?? null,
            });
        }
        const lastLog = await this.prisma.contactSyncLog.findFirst({
            where: { direction: 'GOOGLE_TO_DB' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });
        return {
            contacts: candidates,
            summary: {
                totalFromGoogle: googleContacts.length,
                candidates: candidates.length,
                skippedWithoutIdentifier,
                skippedWithoutPhone,
                skippedDuplicates,
                skippedExcluded,
            },
            lastSyncAt: lastLog?.createdAt ?? null,
        };
    }
    async syncGoogleToDb(payload) {
        const selectedContacts = payload.selectedContacts ?? [];
        const excludedContacts = payload.excludedContacts ?? [];
        const forceSync = payload.forceSync ?? false;
        const exclusionResult = await this.exclusionService.storeExclusions(excludedContacts, 'Excluded by user during manual sync');
        const existingIndex = await this.buildExistingClientIndex();
        const exclusionIndex = forceSync ? null : await this.exclusionService.getExclusionIndex();
        let imported = 0;
        let duplicatesIgnored = 0;
        let excludedIgnored = 0;
        let invalidIgnored = 0;
        for (const selectedContact of selectedContacts) {
            const normalizedEmail = (0, contact_normalization_1.normalizeEmail)(selectedContact.email);
            const phoneInput = selectedContact.phone ?? '';
            const { formatted: formattedPhone, isValid: isValidPhone } = (0, phoneFormatter_1.formatPhoneNumber)(phoneInput);
            const normalizedPhone = isValidPhone ? (0, contact_normalization_1.normalizePhone)(formattedPhone) : null;
            const googleContactId = selectedContact.googleContactId?.trim() || null;
            if (!normalizedEmail && !normalizedPhone) {
                invalidIgnored += 1;
                continue;
            }
            if (!isValidPhone || !normalizedPhone) {
                invalidIgnored += 1;
                continue;
            }
            if (!forceSync &&
                exclusionIndex &&
                this.exclusionService.isExcluded({
                    googleContactId,
                    candidateId: selectedContact.candidateId,
                }, exclusionIndex)) {
                excludedIgnored += 1;
                continue;
            }
            const existsInDb = (googleContactId && existingIndex.googleIds.has(googleContactId)) ||
                (normalizedEmail && existingIndex.emails.has(normalizedEmail)) ||
                (normalizedPhone && existingIndex.phones.has(normalizedPhone));
            if (existsInDb) {
                const existingClient = await this.prisma.client.findFirst({
                    where: {
                        OR: [
                            googleContactId ? { googleContactId } : undefined,
                            normalizedEmail ? { email: normalizedEmail } : undefined,
                            formattedPhone ? { phone: formattedPhone } : undefined,
                            normalizedPhone ? { phone: normalizedPhone } : undefined,
                        ].filter(Boolean),
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        googleContactId: true,
                        interestDescription: true,
                    },
                });
                const nameFromFull = (0, contact_normalization_1.splitFullName)(selectedContact.fullName);
                const firstName = selectedContact.firstName?.trim() || nameFromFull.firstName;
                const lastName = selectedContact.lastName?.trim() || nameFromFull.lastName;
                const incomingBiography = selectedContact.biography?.trim() || null;
                if (existingClient) {
                    await this.prisma.client.update({
                        where: { id: existingClient.id },
                        data: {
                            firstName,
                            lastName,
                            email: normalizedEmail,
                            phone: formattedPhone,
                            googleContactId: googleContactId ?? existingClient.googleContactId,
                            interestDescription: incomingBiography,
                            googleSyncedAt: new Date(),
                        },
                    });
                }
                duplicatesIgnored += 1;
                continue;
            }
            const nameFromFull = (0, contact_normalization_1.splitFullName)(selectedContact.fullName);
            const firstName = selectedContact.firstName?.trim() || nameFromFull.firstName;
            const lastName = selectedContact.lastName?.trim() || nameFromFull.lastName;
            await this.prisma.client.create({
                data: {
                    firstName,
                    lastName,
                    email: normalizedEmail,
                    phone: formattedPhone,
                    googleContactId,
                    googleSyncedAt: new Date(),
                    interestDescription: selectedContact.biography?.trim() || null,
                },
            });
            imported += 1;
            if (googleContactId)
                existingIndex.googleIds.add(googleContactId);
            if (normalizedEmail)
                existingIndex.emails.add(normalizedEmail);
            if (normalizedPhone)
                existingIndex.phones.add(normalizedPhone);
        }
        await this.prisma.contactSyncLog.create({
            data: {
                direction: 'GOOGLE_TO_DB',
                importedCount: imported,
                duplicateCount: duplicatesIgnored,
                excludedCount: excludedIgnored + exclusionResult.stored,
                invalidCount: invalidIgnored,
                details: {
                    selectedCount: selectedContacts.length,
                    excludedCount: excludedContacts.length,
                    forceSync,
                },
            },
        });
        return {
            imported,
            duplicatesIgnored,
            excludedIgnored,
            invalidIgnored,
            exclusionsStored: exclusionResult.stored,
        };
    }
    async syncDbToGoogle() {
        const clients = await this.prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                interestDescription: true,
                googleContactId: true,
            },
        });
        let synced = 0;
        let duplicatesIgnored = 0;
        let invalidIgnored = 0;
        for (const client of clients) {
            const email = (0, contact_normalization_1.normalizeEmail)(client.email);
            const phone = (0, contact_normalization_1.normalizePhone)(client.phone);
            if (!email && !phone) {
                invalidIgnored += 1;
                continue;
            }
            if (client.googleContactId) {
                duplicatesIgnored += 1;
                continue;
            }
            const result = await this.syncClientToGoogle(client);
            if (result.synced) {
                synced += 1;
            }
            else {
                duplicatesIgnored += 1;
            }
        }
        await this.prisma.contactSyncLog.create({
            data: {
                direction: 'DB_TO_GOOGLE',
                importedCount: synced,
                duplicateCount: duplicatesIgnored,
                invalidCount: invalidIgnored,
            },
        });
        return { synced, duplicatesIgnored, invalidIgnored };
    }
    async syncGoogleToDbCron() {
        this.logger.log('Starting scheduled Google Contacts -> DB sync');
        try {
            const preview = await this.getGooglePreview(false, true);
            const selectedContacts = preview.contacts.map((contact) => ({
                candidateId: contact.candidateId,
                googleContactId: contact.googleContactId ?? undefined,
                firstName: contact.firstName,
                lastName: contact.lastName,
                fullName: contact.fullName,
                email: contact.email ?? undefined,
                phone: contact.phone ?? undefined,
                biography: contact.biography ?? undefined,
            }));
            const result = await this.syncGoogleToDb({
                selectedContacts,
                excludedContacts: [],
            });
            this.logger.log(`Scheduled sync completed. Imported=${result.imported}, duplicates=${result.duplicatesIgnored}, excluded=${result.excludedIgnored}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Scheduled sync failed: ${message}`);
        }
    }
    async buildExistingClientIndex() {
        const clients = await this.prisma.client.findMany({
            select: {
                email: true,
                phone: true,
                googleContactId: true,
            },
        });
        const emails = new Set();
        const phones = new Set();
        const googleIds = new Set();
        clients.forEach((client) => {
            const normalizedEmail = (0, contact_normalization_1.normalizeEmail)(client.email);
            const normalizedPhone = (0, contact_normalization_1.normalizePhone)(client.phone);
            if (normalizedEmail)
                emails.add(normalizedEmail);
            if (normalizedPhone)
                phones.add(normalizedPhone);
            if (client.googleContactId)
                googleIds.add(client.googleContactId);
        });
        return { emails, phones, googleIds };
    }
};
exports.SyncContactsService = SyncContactsService;
exports.SyncContactsService = SyncContactsService = SyncContactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_contacts_service_1.GoogleContactsService,
        exclusion_service_1.ExclusionService,
        config_1.ConfigService,
        schedule_1.SchedulerRegistry])
], SyncContactsService);
//# sourceMappingURL=sync-contacts.service.js.map