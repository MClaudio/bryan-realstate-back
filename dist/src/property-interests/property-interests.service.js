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
exports.PropertyInterestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const interestInclude = {
    client: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
        },
    },
    property: {
        select: { id: true, code: true, address: true },
    },
};
const INTEREST_LEVEL_RANK = {
    [client_1.InterestLevel.MuyAlto]: 4,
    [client_1.InterestLevel.Alto]: 3,
    [client_1.InterestLevel.Medio]: 2,
    [client_1.InterestLevel.Bajo]: 1,
};
function toPrismaInterestLevel(raw) {
    const value = typeof raw === 'string' ? raw.toUpperCase() : '';
    switch (value) {
        case 'MUY_ALTO':
        case 'MUYALTO':
        case 'MUY ALTO':
            return client_1.InterestLevel.MuyAlto;
        case 'ALTO':
            return client_1.InterestLevel.Alto;
        case 'BAJO':
            return client_1.InterestLevel.Bajo;
        case 'MEDIO':
        case 'MEDIUM':
            return client_1.InterestLevel.Medio;
        default:
            return undefined;
    }
}
let PropertyInterestsService = class PropertyInterestsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const { propertyId, clientId, interestDate, ...data } = dto;
        return this.prisma.propertyInterest.create({
            data: {
                ...data,
                interestDate: new Date(interestDate),
                property: { connect: { id: propertyId } },
                client: { connect: { id: clientId } },
            },
            include: interestInclude,
        });
    }
    async findAllByProperty(propertyId) {
        const records = await this.prisma.propertyInterest.findMany({
            where: { propertyId },
            include: interestInclude,
        });
        return records.sort((a, b) => {
            const rank = INTEREST_LEVEL_RANK[b.interestLevel] - INTEREST_LEVEL_RANK[a.interestLevel];
            if (rank !== 0)
                return rank;
            return b.interestDate.getTime() - a.interestDate.getTime();
        });
    }
    async findAllByClient(clientId) {
        return this.prisma.propertyInterest.findMany({
            where: { clientId },
            orderBy: { interestDate: 'desc' },
            include: interestInclude,
        });
    }
    async findOne(id) {
        const record = await this.prisma.propertyInterest.findUnique({
            where: { id },
            include: interestInclude,
        });
        if (!record)
            throw new common_1.NotFoundException('Registro de interés no encontrado');
        return record;
    }
    async update(id, dto) {
        await this.findOne(id);
        const { propertyId, clientId, interestDate, ...data } = dto;
        return this.prisma.propertyInterest.update({
            where: { id },
            data: {
                ...data,
                ...(interestDate && { interestDate: new Date(interestDate) }),
                ...(propertyId && { property: { connect: { id: propertyId } } }),
                ...(clientId && { client: { connect: { id: clientId } } }),
            },
            include: interestInclude,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.propertyInterest.delete({ where: { id } });
    }
    async reconcileRecommendations(propertyId, recommendations) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            select: { id: true, code: true },
        });
        if (!property) {
            throw new common_1.NotFoundException('Propiedad no encontrada');
        }
        const today = new Date();
        const normalizedMap = new Map();
        for (const item of recommendations || []) {
            const clientId = String(item.clientId ?? item.client_id ?? '').trim();
            if (!clientId)
                continue;
            const level = toPrismaInterestLevel(item.interestLevel ?? item.interest_level) ?? client_1.InterestLevel.Medio;
            const notes = typeof item.notes === 'string' && item.notes.trim().length > 0
                ? item.notes.trim()
                : typeof item.reason === 'string' && item.reason.trim().length > 0
                    ? item.reason.trim()
                    : undefined;
            const interestDate = typeof item.interestDate === 'string' && item.interestDate.length > 0
                ? new Date(item.interestDate)
                : today;
            const prev = normalizedMap.get(clientId);
            if (!prev || INTEREST_LEVEL_RANK[level] > INTEREST_LEVEL_RANK[prev.level]) {
                normalizedMap.set(clientId, { level, notes, interestDate });
            }
        }
        const existing = await this.prisma.propertyInterest.findMany({
            where: { propertyId },
            select: { id: true, clientId: true, interestLevel: true, interestDate: true, notes: true },
        });
        const existingByClient = new Map(existing.map((e) => [e.clientId, e]));
        const toCreate = [];
        const toUpdate = [];
        const toDelete = [];
        await this.prisma.$transaction(async (tx) => {
            for (const [clientId, incoming] of normalizedMap) {
                const curr = existingByClient.get(clientId);
                if (!curr) {
                    await tx.propertyInterest.create({
                        data: {
                            property: { connect: { id: propertyId } },
                            client: { connect: { id: clientId } },
                            interestLevel: incoming.level,
                            interestDate: incoming.interestDate,
                            notes: incoming.notes,
                        },
                        select: { id: true },
                    });
                    toCreate.push(clientId);
                }
                else {
                    const levelChanged = curr.interestLevel !== incoming.level;
                    const notesChanged = (curr.notes ?? '') !== (incoming.notes ?? '') && incoming.notes !== undefined;
                    if (levelChanged || notesChanged) {
                        await tx.propertyInterest.update({
                            where: { id: curr.id },
                            data: {
                                interestLevel: incoming.level,
                                ...(incoming.notes !== undefined && { notes: incoming.notes }),
                            },
                            select: { id: true },
                        });
                    }
                    toUpdate.push(clientId);
                }
            }
            const wantedIds = new Set(normalizedMap.keys());
            for (const curr of existing) {
                if (!wantedIds.has(curr.clientId)) {
                    await tx.propertyInterest.delete({ where: { id: curr.id } });
                    toDelete.push(curr.clientId);
                }
            }
        });
        return {
            propertyId,
            summary: {
                totalIncoming: normalizedMap.size,
                created: toCreate.length,
                updated: toUpdate.length,
                deleted: toDelete.length,
            },
            clientChanges: { created: toCreate, updated: toUpdate, deleted: toDelete },
            interests: await this.findAllByProperty(propertyId),
        };
    }
};
exports.PropertyInterestsService = PropertyInterestsService;
exports.PropertyInterestsService = PropertyInterestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropertyInterestsService);
//# sourceMappingURL=property-interests.service.js.map