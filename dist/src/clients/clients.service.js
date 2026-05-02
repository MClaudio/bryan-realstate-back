"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const sync_contacts_service_1 = require("../sync-contacts/sync-contacts.service");
const phoneFormatter_1 = require("../utils/phoneFormatter");
let ClientsService = class ClientsService {
    prisma;
    syncContactsService;
    constructor(prisma, syncContactsService) {
        this.prisma = prisma;
        this.syncContactsService = syncContactsService;
    }
    async create(createClientDto) {
        if (createClientDto.email) {
            const existingClient = await this.prisma.client.findFirst({
                where: { email: createClientDto.email },
            });
            if (existingClient) {
                throw new common_1.ConflictException(`Client with email ${createClientDto.email} already exists`);
            }
        }
        if (!createClientDto.phone || !createClientDto.phone.trim()) {
            throw new common_1.BadRequestException('El teléfono es requerido');
        }
        if (!(0, phoneFormatter_1.validatePhoneNumber)(createClientDto.phone)) {
            throw new common_1.BadRequestException('El número telefónico es inválido. Debe incluir código de país y tener al menos 7 dígitos (ej: +593978961341 o 0978961341)');
        }
        const { formatted: formattedPhone } = (0, phoneFormatter_1.formatPhoneNumber)(createClientDto.phone);
        const { password, ...clientData } = createClientDto;
        let passwordHash = undefined;
        if (password) {
            const salt = await bcrypt.genSalt();
            passwordHash = await bcrypt.hash(password, salt);
        }
        const createdClient = await this.prisma.client.create({
            data: {
                ...clientData,
                phone: formattedPhone,
                password: passwordHash,
            },
        });
        await this.syncContactsService.syncClientToGoogle(createdClient);
        return createdClient;
    }
    async findAll() {
        return this.prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });
    }
    async findOne(id) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        }
        return client;
    }
    async update(id, updateClientDto) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client)
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        const { password, ...updateData } = updateClientDto;
        const data = { ...updateData };
        if (updateData.phone) {
            if (!updateData.phone.trim()) {
                throw new common_1.BadRequestException('El teléfono no puede estar vacío');
            }
            if (!(0, phoneFormatter_1.validatePhoneNumber)(updateData.phone)) {
                throw new common_1.BadRequestException('El número telefónico es inválido. Debe incluir código de país y tener al menos 7 dígitos (ej: +593978961341 o 0978961341)');
            }
            const { formatted: formattedPhone } = (0, phoneFormatter_1.formatPhoneNumber)(updateData.phone);
            data.phone = formattedPhone;
        }
        if (password) {
            const salt = await bcrypt.genSalt();
            data.password = await bcrypt.hash(password, salt);
        }
        const updatedClient = await this.prisma.client.update({
            where: { id },
            data,
        });
        if (updatedClient.googleContactId) {
            await this.syncContactsService.updateClientInGoogle({
                id: updatedClient.id,
                firstName: updatedClient.firstName,
                lastName: updatedClient.lastName,
                email: updatedClient.email,
                phone: updatedClient.phone,
                googleContactId: updatedClient.googleContactId,
                interestDescription: updatedClient.interestDescription,
            });
        }
        else {
            await this.syncContactsService.syncClientToGoogle(updatedClient);
        }
        return updatedClient;
    }
    async remove(id) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client)
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        return this.prisma.client.delete({
            where: { id },
        });
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sync_contacts_service_1.SyncContactsService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map