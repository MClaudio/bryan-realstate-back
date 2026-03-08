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
        return this.prisma.propertyInterest.findMany({
            where: { propertyId },
            orderBy: { interestDate: 'desc' },
            include: interestInclude,
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
};
exports.PropertyInterestsService = PropertyInterestsService;
exports.PropertyInterestsService = PropertyInterestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropertyInterestsService);
//# sourceMappingURL=property-interests.service.js.map