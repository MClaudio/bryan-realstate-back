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
    const { fileIds, documentFileIds, advisorId, ...propertyData } = createPropertyDto;

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

    // Prepare create data, handling advisor relationship
    const createData: any = { ...propertyData };
    if (advisorId) {
      createData.advisor = { connect: { id: advisorId } };
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
            ...(fileIds ? fileIds.map(fid => ({
              file: { connect: { id: fid } },
              fileType: FileType.image
            })) : []),
            ...(documentFileIds ? documentFileIds.map(fid => ({
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
    const updateData: any = { ...propertyData };
    if (advisorId) {
      updateData.advisor = { connect: { id: advisorId } };
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
}
