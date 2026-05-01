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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExclusionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExclusionService = class ExclusionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getExclusionIndex() {
        const exclusions = await this.prisma.contactSyncExclusion.findMany({
            select: {
                candidateId: true,
                googleContactId: true,
            },
        });
        const googleIds = new Set();
        const candidateIds = new Set();
        exclusions.forEach((exclusion) => {
            if (exclusion.googleContactId)
                googleIds.add(exclusion.googleContactId);
            if (exclusion.candidateId)
                candidateIds.add(exclusion.candidateId);
        });
        return { googleIds, candidateIds };
    }
    isExcluded(contact, exclusionIndex) {
        if (contact.googleContactId && exclusionIndex.googleIds.has(contact.googleContactId))
            return true;
        if (contact.candidateId && exclusionIndex.candidateIds.has(contact.candidateId))
            return true;
        return false;
    }
    async storeExclusions(contacts, reason = 'Manual exclusion') {
        if (contacts.length === 0) {
            return { stored: 0 };
        }
        let stored = 0;
        for (const contact of contacts) {
            const candidateId = contact.candidateId?.trim() || null;
            const googleContactId = contact.googleContactId?.trim() || null;
            if (!googleContactId && !candidateId) {
                continue;
            }
            const existing = await this.prisma.contactSyncExclusion.findFirst({
                where: {
                    OR: [
                        { googleContactId: googleContactId ?? undefined },
                        { candidateId: candidateId ?? undefined },
                    ],
                },
            });
            if (existing) {
                await this.prisma.contactSyncExclusion.update({
                    where: { id: existing.id },
                    data: {
                        candidateId,
                        googleContactId,
                        reason,
                    },
                });
            }
            else {
                await this.prisma.contactSyncExclusion.create({
                    data: {
                        candidateId,
                        googleContactId,
                        reason,
                    },
                });
            }
            stored += 1;
        }
        return { stored };
    }
};
exports.ExclusionService = ExclusionService;
exports.ExclusionService = ExclusionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExclusionService);
//# sourceMappingURL=exclusion.service.js.map