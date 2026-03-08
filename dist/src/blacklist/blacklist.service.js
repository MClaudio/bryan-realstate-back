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
exports.BlacklistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BlacklistService = class BlacklistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createBlacklistDto) {
        return this.prisma.blacklist.create({ data: createBlacklistDto });
    }
    async findAll() {
        return this.prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async findOne(id) {
        const entry = await this.prisma.blacklist.findUnique({ where: { id } });
        if (!entry)
            throw new common_1.NotFoundException(`Blacklist entry with ID ${id} not found`);
        return entry;
    }
    async update(id, updateBlacklistDto) {
        await this.findOne(id);
        return this.prisma.blacklist.update({ where: { id }, data: updateBlacklistDto });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.blacklist.delete({ where: { id } });
    }
};
exports.BlacklistService = BlacklistService;
exports.BlacklistService = BlacklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlacklistService);
//# sourceMappingURL=blacklist.service.js.map