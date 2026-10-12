import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { FeedbackRating, InterestLevel, InterestSource } from '@prisma/client';

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
    // Quitar a mano un interesado anula su like (eliminado lógico, queda en el histórico);
    // si no, la IA lo seguiría tratando como "confirmado" y no volvería a evaluarlo.
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

  async reconcileRecommendations(
    propertyId: string,
    recommendations: Array<{
      client_id?: string;
      clientId?: string;
      interest_level?: unknown;
      interestLevel?: unknown;
      reason?: string;
      notes?: string;
      interestDate?: string;
    }>,
    /**
     * Los interesados `manual` (formulario, WhatsApp) nunca se modifican ni se borran.
     * - `merge`: solo agrega/actualiza interesados de la IA; no borra nada.
     * - `replaceAi` (por defecto): además borra los de origen IA que no vienen en la lista.
     */
    options: { mode?: 'merge' | 'replaceAi' } = {},
  ) {
    const mode = options.mode ?? 'replaceAi';
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, code: true },
    });
    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const today = new Date();
    const normalizedMap = new Map<
      string,
      { level: InterestLevel; notes?: string; interestDate: Date }
    >();

    for (const item of recommendations || []) {
      const clientId = String(item.clientId ?? item.client_id ?? '').trim();
      if (!clientId) continue;

      const level =
        toPrismaInterestLevel(item.interestLevel ?? item.interest_level) ??
        InterestLevel.Medio;
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
      if (
        !prev ||
        INTEREST_LEVEL_RANK[level] > INTEREST_LEVEL_RANK[prev.level]
      ) {
        normalizedMap.set(clientId, { level, notes, interestDate });
      }
    }

    // Ids the AI invented or took from another source would make `connect`
    // fail and roll back the whole sync; drop them instead.
    const validIds = await this.existingClientIds([...normalizedMap.keys()]);
    const discarded = [...normalizedMap.keys()].filter(
      (cid) => !validIds.has(cid),
    );
    for (const cid of discarded) normalizedMap.delete(cid);
    if (discarded.length > 0 && normalizedMap.size === 0) {
      // Never let a list of bogus ids turn into "delete every interested client".
      throw new BadRequestException(
        'ninguno de los clientes recomendados existe en Clientes',
      );
    }

    // Calificaciones del equipo: un dislike bloquea al cliente para esta propiedad y un like
    // confirma la recomendación (no se reemplaza ni se borra).
    const activeFeedback = await this.prisma.recommendationFeedback.findMany({
      where: { propertyId, deletedAt: null },
      select: { clientId: true, rating: true },
    });
    const blocked = new Set(
      activeFeedback
        .filter((f) => f.rating === FeedbackRating.dislike)
        .map((f) => f.clientId),
    );
    const liked = new Set(
      activeFeedback
        .filter((f) => f.rating === FeedbackRating.like)
        .map((f) => f.clientId),
    );
    const skippedByFeedback: string[] = [];
    for (const cid of [...normalizedMap.keys()]) {
      if (blocked.has(cid)) {
        normalizedMap.delete(cid);
        skippedByFeedback.push(cid);
      }
    }

    const existing = await this.prisma.propertyInterest.findMany({
      where: { propertyId },
      select: {
        id: true,
        clientId: true,
        interestLevel: true,
        interestDate: true,
        notes: true,
        source: true,
      },
    });
    const existingByClient = new Map(existing.map((e) => [e.clientId, e]));

    const toCreate: string[] = [];
    const toUpdate: string[] = [];
    const toDelete: string[] = [];
    const keptManual: string[] = [];

    await this.prisma.$transaction(
      async (tx) => {
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
                source: InterestSource.ia,
              },
              select: { id: true },
            });
            toCreate.push(clientId);
          } else if (curr.source === InterestSource.manual) {
            // Registrado a mano o por WhatsApp: se respeta tal cual.
            keptManual.push(clientId);
          } else {
            const levelChanged = curr.interestLevel !== incoming.level;
            const notesChanged =
              (curr.notes ?? '') !== (incoming.notes ?? '') &&
              incoming.notes !== undefined;
            if (levelChanged || notesChanged) {
              await tx.propertyInterest.update({
                where: { id: curr.id },
                data: {
                  interestLevel: incoming.level,
                  ...(incoming.notes !== undefined && {
                    notes: incoming.notes,
                  }),
                },
                select: { id: true },
              });
              toUpdate.push(clientId);
            }
          }
        }

        const wantedIds = new Set(normalizedMap.keys());
        for (const curr of mode === 'replaceAi' ? existing : []) {
          if (
            curr.source === InterestSource.ia &&
            !wantedIds.has(curr.clientId) &&
            !liked.has(curr.clientId)
          ) {
            await tx.propertyInterest.delete({ where: { id: curr.id } });
            toDelete.push(curr.clientId);
          }
        }
      },
      { timeout: 30000 },
    ); // remote DB + one round trip per row

    return {
      propertyId,
      summary: {
        totalIncoming: normalizedMap.size,
        created: toCreate.length,
        updated: toUpdate.length,
        deleted: toDelete.length,
        discarded: discarded.length,
      },
      clientChanges: {
        created: toCreate,
        updated: toUpdate,
        deleted: toDelete,
        discarded,
        keptManual,
        skippedByFeedback,
      },
      interests: await this.findAllByProperty(propertyId),
    };
  }

  /** Subset of `ids` that are real clients (malformed UUIDs are ignored). */
  async existingClientIds(ids: string[]): Promise<Set<string>> {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const wellFormed = ids.filter((id) => uuidRe.test(id));
    if (wellFormed.length === 0) return new Set();
    const rows = await this.prisma.client.findMany({
      where: { id: { in: wellFormed } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}
