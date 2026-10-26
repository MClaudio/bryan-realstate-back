import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { FeedbackRating, InterestLevel } from '@prisma/client';

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

const INTEREST_LEVEL_RANK: Record<InterestLevel, number> = {
  [InterestLevel.MuyAlto]: 4,
  [InterestLevel.Alto]: 3,
  [InterestLevel.Medio]: 2,
  [InterestLevel.Bajo]: 1,
};

@Injectable()
export class PropertyInterestsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePropertyInterestDto) {
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

  async findAllByProperty(propertyId: string) {
    const records = await this.prisma.propertyInterest.findMany({
      where: { propertyId },
      include: interestInclude,
    });
    return records.sort((a, b) => {
      const rank =
        INTEREST_LEVEL_RANK[b.interestLevel] -
        INTEREST_LEVEL_RANK[a.interestLevel];
      if (rank !== 0) return rank;
      return b.interestDate.getTime() - a.interestDate.getTime();
    });
  }

  async findAllByClient(clientId: string) {
    return this.prisma.propertyInterest.findMany({
      where: { clientId },
      orderBy: { interestDate: 'desc' },
      include: interestInclude,
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.propertyInterest.findUnique({
      where: { id },
      include: interestInclude,
    });
    if (!record)
      throw new NotFoundException('Registro de interés no encontrado');
    return record;
  }

  async update(id: string, dto: UpdatePropertyInterestDto) {
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

  async remove(id: string) {
    const interest = await this.findOne(id);
    // Quitar a mano un interesado anula su like (eliminado lógico, queda en el histórico).
    await this.prisma.recommendationFeedback.updateMany({
      where: {
        propertyId: interest.propertyId,
        clientId: interest.clientId,
        rating: FeedbackRating.like,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    return this.prisma.propertyInterest.delete({ where: { id } });
  }
}
