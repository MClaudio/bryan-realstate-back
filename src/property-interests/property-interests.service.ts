import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { InterestLevel } from '@prisma/client';

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

export interface RecommendedClientInterest {
  clientId: string;
  interestLevel: InterestLevel;
  interestDate?: string;
  notes?: string;
}

const INTEREST_LEVEL_RANK: Record<InterestLevel, number> = {
  [InterestLevel.MuyAlto]: 4,
  [InterestLevel.Alto]: 3,
  [InterestLevel.Medio]: 2,
  [InterestLevel.Bajo]: 1,
};

function toPrismaInterestLevel(raw: unknown): InterestLevel | undefined {
  const value = typeof raw === 'string' ? raw.toUpperCase() : '';
  switch (value) {
    case 'MUY_ALTO':
    case 'MUYALTO':
    case 'MUY ALTO':
      return InterestLevel.MuyAlto;
    case 'ALTO':
      return InterestLevel.Alto;
    case 'BAJO':
      return InterestLevel.Bajo;
    case 'MEDIO':
    case 'MEDIUM':
      return InterestLevel.Medio;
    default:
      return undefined;
  }
}

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
      const rank = INTEREST_LEVEL_RANK[b.interestLevel] - INTEREST_LEVEL_RANK[a.interestLevel];
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
    if (!record) throw new NotFoundException('Registro de interés no encontrado');
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
    await this.findOne(id);
    return this.prisma.propertyInterest.delete({ where: { id } });
  }

  async reconcileRecommendations(
    propertyId: string,
    recommendations: Array<{ client_id?: string; clientId?: string; interest_level?: unknown; interestLevel?: unknown; reason?: string; notes?: string; interestDate?: string }>,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, code: true },
    });
    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const today = new Date();
    const normalizedMap = new Map<string, { level: InterestLevel; notes?: string; interestDate: Date }>();

    for (const item of recommendations || []) {
      const clientId = String(item.clientId ?? item.client_id ?? '').trim();
      if (!clientId) continue;

      const level =
        toPrismaInterestLevel(item.interestLevel ?? item.interest_level) ?? InterestLevel.Medio;
      const notes =
        typeof item.notes === 'string' && item.notes.trim().length > 0
          ? item.notes.trim()
          : typeof item.reason === 'string' && item.reason.trim().length > 0
          ? item.reason.trim()
          : undefined;
      const interestDate =
        typeof item.interestDate === 'string' && item.interestDate.length > 0
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

    const toCreate: string[] = [];
    const toUpdate: string[] = [];
    const toDelete: string[] = [];

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
        } else {
          const levelChanged = curr.interestLevel !== incoming.level;
          const notesChanged =
            (curr.notes ?? '') !== (incoming.notes ?? '') && incoming.notes !== undefined;
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
}
