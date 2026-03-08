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
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const dmmfModels = client_1.Prisma.dmmf?.datamodel?.models ?? [];
const propertyModelFields = new Set(dmmfModels.find((m) => m.name === 'Property')?.fields.map((f) => f.name) ?? []);
function omitUndefined(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
let PropertiesService = class PropertiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createPropertyDto) {
        const { fileIds, documentFileIds, advisorId, negotiationClientId, ...propertyData } = createPropertyDto;
        if (fileIds && fileIds.length > 0) {
            const validFileIds = fileIds.filter((id) => id && typeof id === 'string' && id.length === 36);
            if (validFileIds.length !== fileIds.length) {
                throw new common_1.BadRequestException('Invalid file IDs format');
            }
        }
        if (documentFileIds && documentFileIds.length > 0) {
            const validDocumentFileIds = documentFileIds.filter((id) => id && typeof id === 'string' && id.length === 36);
            if (validDocumentFileIds.length !== documentFileIds.length) {
                throw new common_1.BadRequestException('Invalid document file IDs format');
            }
        }
        const createData = { ...propertyData };
        if (advisorId) {
            createData.advisor = { connect: { id: advisorId } };
        }
        if (negotiationClientId) {
            createData.negotiationClient = { connect: { id: negotiationClientId } };
        }
        if (createData.isActive === undefined) {
            createData.isActive = true;
        }
        if (!propertyModelFields.has('isFeatured')) {
            delete createData.isFeatured;
        }
        if (!propertyModelFields.has('isActive')) {
            delete createData.isActive;
        }
        const property = await this.prisma.property.create({
            data: {
                ...omitUndefined(createData),
                files: {
                    create: [
                        ...(fileIds ? fileIds.map((fid) => ({
                            file: { connect: { id: fid } },
                            fileType: client_1.FileType.image
                        })) : []),
                        ...(documentFileIds ? documentFileIds.map((fid) => ({
                            file: { connect: { id: fid } },
                            fileType: client_1.FileType.document
                        })) : [])
                    ]
                }
            },
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            }
        });
        return property;
    }
    async findAll() {
        return this.prisma.property.findMany({
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findFeatured() {
        return this.prisma.property.findMany({
            where: {
                isPublic: true,
                isFeatured: true
            },
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 6
        });
    }
    async findOnePublic(id) {
        const property = await this.prisma.property.findFirst({
            where: { id, isPublic: true },
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            },
        });
        if (!property) {
            throw new common_1.NotFoundException(`Property with ID ${id} not found or not public`);
        }
        return property;
    }
    async findOne(id) {
        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            },
        });
        if (!property) {
            throw new common_1.NotFoundException(`Property with ID ${id} not found`);
        }
        return property;
    }
    async update(id, updatePropertyDto) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property)
            throw new common_1.NotFoundException(`Property with ID ${id} not found`);
        const { fileIds, documentFileIds, advisorId, ...propertyData } = updatePropertyDto;
        console.log('=== UPDATING PROPERTY ===');
        console.log('Property ID:', id);
        console.log('fileIds received:', fileIds);
        console.log('documentFileIds received:', documentFileIds);
        if (fileIds && fileIds.length > 0) {
            const validFileIds = fileIds.filter(id => id && typeof id === 'string' && id.length === 36);
            if (validFileIds.length !== fileIds.length) {
                throw new common_1.BadRequestException('Invalid file IDs format');
            }
        }
        if (documentFileIds && documentFileIds.length > 0) {
            const validDocumentFileIds = documentFileIds.filter(id => id && typeof id === 'string' && id.length === 36);
            if (validDocumentFileIds.length !== documentFileIds.length) {
                throw new common_1.BadRequestException('Invalid document file IDs format');
            }
        }
        const { negotiationClientId, ...restPropertyData } = propertyData;
        const updateData = { ...restPropertyData };
        if (advisorId) {
            updateData.advisor = { connect: { id: advisorId } };
        }
        if (negotiationClientId !== undefined) {
            updateData.negotiationClient = negotiationClientId
                ? { connect: { id: negotiationClientId } }
                : { disconnect: true };
        }
        if (!propertyModelFields.has('isFeatured')) {
            delete updateData.isFeatured;
        }
        if (!propertyModelFields.has('isActive')) {
            delete updateData.isActive;
        }
        if (fileIds !== undefined || documentFileIds !== undefined) {
            console.log('Updating files...');
            await this.prisma.propertyFile.deleteMany({
                where: { propertyId: id }
            });
            console.log('Deleted existing file relations');
            const fileRelations = [
                ...(fileIds ? fileIds.map(fid => ({
                    file: { connect: { id: fid } },
                    fileType: client_1.FileType.image
                })) : []),
                ...(documentFileIds ? documentFileIds.map(fid => ({
                    file: { connect: { id: fid } },
                    fileType: client_1.FileType.document
                })) : [])
            ];
            console.log('File relations to create:', fileRelations.length);
            if (fileRelations.length) {
                updateData.files = {
                    create: fileRelations
                };
            }
        }
        const updatedProperty = await this.prisma.property.update({
            where: { id },
            data: omitUndefined(updateData),
            include: {
                advisor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                negotiationClient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                files: {
                    include: {
                        file: true
                    }
                }
            }
        });
        console.log('Updated property with files:', updatedProperty.files?.length || 0);
        return updatedProperty;
    }
    async remove(id) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property)
            throw new common_1.NotFoundException(`Property with ID ${id} not found`);
        await this.prisma.propertyFile.deleteMany({
            where: { propertyId: id }
        });
        return this.prisma.property.delete({
            where: { id },
        });
    }
    async resolveMapsUrl(url) {
        const response = await fetch(url, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const finalUrl = response.url;
        const placeMatches = [...finalUrl.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
        if (placeMatches.length > 0) {
            const last = placeMatches[placeMatches.length - 1];
            return { latitude: last[1], longitude: last[2], resolvedUrl: finalUrl };
        }
        const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
            return { latitude: atMatch[1], longitude: atMatch[2], resolvedUrl: finalUrl };
        }
        const paramPatterns = [
            /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
        ];
        for (const pattern of paramPatterns) {
            const match = finalUrl.match(pattern);
            if (match)
                return { latitude: match[1], longitude: match[2], resolvedUrl: finalUrl };
        }
        throw new common_1.BadRequestException('No se pudieron extraer coordenadas de la URL proporcionada');
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map