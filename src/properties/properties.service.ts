import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus, FileType, Prisma } from '@prisma/client';

const dmmfModels: Array<{ name: string; fields: Array<{ name: string }> }> =
  (Prisma as any).dmmf?.datamodel?.models ?? [];
const propertyModelFields = new Set(
  dmmfModels.find((m) => m.name === 'Property')?.fields.map((f) => f.name) ?? [],
);

function omitUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) { }

  async create(createPropertyDto: CreatePropertyDto) {
    const { fileIds, documentFileIds, advisorId, negotiationClientId, ...propertyData } = createPropertyDto as CreatePropertyDto & { negotiationClientId?: string };

    // Validate file IDs if provided
    if (fileIds && fileIds.length > 0) {
      const validFileIds = fileIds.filter((id: string) => id && typeof id === 'string' && id.length === 36);
      if (validFileIds.length !== fileIds.length) {
        throw new BadRequestException('Invalid file IDs format');
      }
    }

    if (documentFileIds && documentFileIds.length > 0) {
      const validDocumentFileIds = documentFileIds.filter((id: string) => id && typeof id === 'string' && id.length === 36);
      if (validDocumentFileIds.length !== documentFileIds.length) {
        throw new BadRequestException('Invalid document file IDs format');
      }
    }

    // Prepare create data, handling advisor relationship
    const createData: any = { ...propertyData };
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
            ...(fileIds ? fileIds.map((fid: string) => ({
              file: { connect: { id: fid } },
              fileType: FileType.image
            })) : []),
            ...(documentFileIds ? documentFileIds.map((fid: string) => ({
              file: { connect: { id: fid } },
              fileType: FileType.document
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
      } as Prisma.PropertyWhereInput,
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

  async findOnePublic(id: string) {
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
      throw new NotFoundException(`Property with ID ${id} not found or not public`);
    }

    return property;
  }

  async findOne(id: string) {
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
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);

    const { fileIds, documentFileIds, advisorId, ...propertyData } = updatePropertyDto;

    console.log('=== UPDATING PROPERTY ===');
    console.log('Property ID:', id);
    console.log('fileIds received:', fileIds);
    console.log('documentFileIds received:', documentFileIds);

    // Validate file IDs if provided
    if (fileIds && fileIds.length > 0) {
      const validFileIds = fileIds.filter(id => id && typeof id === 'string' && id.length === 36);
      if (validFileIds.length !== fileIds.length) {
        throw new BadRequestException('Invalid file IDs format');
      }
    }

    if (documentFileIds && documentFileIds.length > 0) {
      const validDocumentFileIds = documentFileIds.filter(id => id && typeof id === 'string' && id.length === 36);
      if (validDocumentFileIds.length !== documentFileIds.length) {
        throw new BadRequestException('Invalid document file IDs format');
      }
    }

    // Prepare update data, handling advisor relationship and files
    const { negotiationClientId, ...restPropertyData } = propertyData as any;
    const updateData: any = { ...restPropertyData };
    if (advisorId) {
      updateData.advisor = { connect: { id: advisorId } };
    }
    // Handle negotiationClient relation
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

    // Handle files update if provided
    if (fileIds !== undefined || documentFileIds !== undefined) {
      console.log('Updating files...');
      // First delete existing relations
      await this.prisma.propertyFile.deleteMany({
        where: { propertyId: id }
      });
      console.log('Deleted existing file relations');

      const fileRelations = [
        ...(fileIds ? fileIds.map(fid => ({
          file: { connect: { id: fid } },
          fileType: FileType.image
        })) : []),
        ...(documentFileIds ? documentFileIds.map(fid => ({
          file: { connect: { id: fid } },
          fileType: FileType.document
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

  async remove(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);

    await this.prisma.propertyFile.deleteMany({
      where: { propertyId: id }
    });

    return this.prisma.property.delete({
      where: { id },
    });
  }

  async resolveMapsUrl(url: string): Promise<{ latitude: string; longitude: string; resolvedUrl: string }> {
    // Follow all redirects to get the final Google Maps URL
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const finalUrl = response.url;

    // Try !3d / !4d pattern (place pin)
    const placeMatches = [...finalUrl.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
    if (placeMatches.length > 0) {
      const last = placeMatches[placeMatches.length - 1];
      return { latitude: last[1], longitude: last[2], resolvedUrl: finalUrl };
    }

    // Try @lat,lng pattern (map center / directions)
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { latitude: atMatch[1], longitude: atMatch[2], resolvedUrl: finalUrl };
    }

    // Try /search/lat,lng or /place/lat,lng pattern
    const searchMatch = finalUrl.match(/\/(?:search|place)\/(-?\d+\.\d+)(?:,|%2C|\+|\s)+(-?\d+\.\d+)/i);
    if (searchMatch) {
      return { latitude: searchMatch[1], longitude: searchMatch[2], resolvedUrl: finalUrl };
    }

    // Try q= or ll= param
    const paramPatterns = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const pattern of paramPatterns) {
      const match = finalUrl.match(pattern);
      if (match) return { latitude: match[1], longitude: match[2], resolvedUrl: finalUrl };
    }

    throw new BadRequestException('No se pudieron extraer coordenadas de la URL proporcionada');
  }
}
