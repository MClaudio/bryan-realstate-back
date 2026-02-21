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
exports.ProcessesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const processInclude = {
    property: { select: { id: true, code: true, address: true } },
    files: {
        include: {
            file: {
                select: { id: true, originalName: true, path: true, size: true },
            },
        },
    },
};
let ProcessesService = class ProcessesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const { fileIds, propertyId, ...data } = dto;
        return this.prisma.process.create({
            data: {
                ...data,
                expenses: (data.expenses ?? []),
                property: { connect: { id: propertyId } },
                files: fileIds?.length
                    ? {
                        create: fileIds.map((fid) => ({
                            file: { connect: { id: fid } },
                        })),
                    }
                    : undefined,
            },
            include: processInclude,
        });
    }
    async findAllByProperty(propertyId) {
        return this.prisma.process.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
            include: processInclude,
        });
    }
    async findOne(id) {
        const process = await this.prisma.process.findUnique({
            where: { id },
            include: processInclude,
        });
        if (!process)
            throw new common_1.NotFoundException('Proceso no encontrado');
        return process;
    }
    async update(id, dto) {
        await this.findOne(id);
        const { fileIds, propertyId, expenses, ...data } = dto;
        if (fileIds !== undefined) {
            await this.prisma.processFile.deleteMany({ where: { processId: id } });
        }
        return this.prisma.process.update({
            where: { id },
            data: {
                ...data,
                ...(expenses !== undefined && { expenses: expenses }),
                files: fileIds !== undefined
                    ? {
                        create: fileIds.map((fid) => ({
                            file: { connect: { id: fid } },
                        })),
                    }
                    : undefined,
            },
            include: processInclude,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.process.delete({ where: { id } });
    }
};
exports.ProcessesService = ProcessesService;
exports.ProcessesService = ProcessesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProcessesService);
//# sourceMappingURL=processes.service.js.map