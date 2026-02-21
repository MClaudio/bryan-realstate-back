import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { Prisma } from '@prisma/client';

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

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProcessDto) {
    const { fileIds, propertyId, ...data } = dto;

    return this.prisma.process.create({
      data: {
        ...data,
        expenses: (data.expenses ?? []) as unknown as Prisma.InputJsonValue,
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

  async findAllByProperty(propertyId: string) {
    return this.prisma.process.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      include: processInclude,
    });
  }

  async findOne(id: string) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: processInclude,
    });
    if (!process) throw new NotFoundException('Proceso no encontrado');
    return process;
  }

  async update(id: string, dto: UpdateProcessDto) {
    await this.findOne(id);
    const { fileIds, propertyId, expenses, ...data } = dto;

    // Replace file associations if provided
    if (fileIds !== undefined) {
      await this.prisma.processFile.deleteMany({ where: { processId: id } });
    }

    return this.prisma.process.update({
      where: { id },
      data: {
        ...data,
        ...(expenses !== undefined && { expenses: expenses as unknown as Prisma.InputJsonValue }),
        files:
          fileIds !== undefined
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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.process.delete({ where: { id } });
  }
}
