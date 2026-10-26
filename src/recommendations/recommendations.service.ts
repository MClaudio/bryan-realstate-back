import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeedbackRating,
  InterestLevel,
  InterestSource,
  MatchLevel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientCriteriaService } from './client-criteria.service';
import {
  MatchEngineService,
  propertyMatchSelect,
  toPropertyMatchData,
} from './match-engine.service';
import { RateMatchDto } from './dto/rate-match.dto';

const LEVEL_ORDER: Record<MatchLevel, number> = { ALTO: 0, MEDIO: 1, BAJO: 2 };
const TO_INTEREST_LEVEL: Record<MatchLevel, InterestLevel> = {
  ALTO: InterestLevel.Alto,
  MEDIO: InterestLevel.Medio,
  BAJO: InterestLevel.Bajo,
};

const sortMatches = <T extends { level: MatchLevel; score: number }>(
  items: T[],
): T[] =>
  [...items].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.score - a.score,
  );

const matchFields = {
  level: true,
  score: true,
  matched: true,
  unconfirmed: true,
  explanation: true,
  calculatedAt: true,
} satisfies Prisma.PropertyMatchSelect;

/** API del motor de recomendaciones (consulta de matches guardados, recálculo, calificaciones). */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly criteriaService: ClientCriteriaService,
    private readonly matchEngine: MatchEngineService,
  ) {}

  private async assertProperty(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
  }

  /** Clientes recomendados para una propiedad + los descartados por el equipo. */
  async listForProperty(propertyId: string) {
    await this.assertProperty(propertyId);
    const [matches, feedback, interested] = await Promise.all([
      this.prisma.propertyMatch.findMany({
        where: { propertyId },
        select: {
          ...matchFields,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              interestDescription: true,
              notes: true,
            },
          },
        },
      }),
      this.prisma.recommendationFeedback.findMany({
        where: { propertyId, deletedAt: null },
        select: {
          clientId: true,
          rating: true,
          reason: true,
          comment: true,
          createdAt: true,
          client: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propertyInterest.findMany({
        where: { propertyId },
        select: { clientId: true },
      }),
    ]);
    const liked = new Set(
      feedback
        .filter((f) => f.rating === FeedbackRating.like)
        .map((f) => f.clientId),
    );
    const interestedIds = new Set(interested.map((i) => i.clientId));
    return {
      matches: sortMatches(matches).map((m) => ({
        ...m,
        liked: liked.has(m.client.id),
        alreadyInterested: interestedIds.has(m.client.id),
      })),
      discarded: feedback.filter((f) => f.rating === FeedbackRating.dislike),
    };
  }

  async recomputeProperty(propertyId: string) {
    await this.assertProperty(propertyId);
    const summary = await this.matchEngine.recomputeProperty(propertyId);
    return { summary, ...(await this.listForProperty(propertyId)) };
  }

  /** Propiedades recomendadas para un cliente. */
  async listForClient(clientId: string) {
    const matches = await this.prisma.propertyMatch.findMany({
      where: { clientId },
      select: {
        ...matchFields,
        property: {
          select: {
            id: true,
            code: true,
            propertyType: true,
            referenceSector: true,
            price: true,
            landArea: true,
            constructionArea: true,
            city: { select: { name: true } },
          },
        },
      },
    });
    return sortMatches(matches);
  }

  async getCriteria(clientId: string) {
    return this.criteriaService.getForClient(clientId);
  }

  /** Vuelve a leer el interés del cliente (reglas / IA) y recalcula sus propiedades. */
  async refreshClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    const extraction = await this.criteriaService.extractClients([clientId], {
      force: true,
    });
    const summary = await this.matchEngine.recomputeClient(clientId);
    return {
      extraction,
      summary,
      criteria: await this.criteriaService.getForClient(clientId),
      matches: await this.listForClient(clientId),
    };
  }

  /**
   * Like / dislike de una recomendación. Dislike: se quita y no se vuelve a recomendar ese cliente
   * para esa propiedad. Like: confirmada. Se guarda un snapshot para revisar errores del motor.
   */
  async rate(
    propertyId: string,
    clientId: string,
    dto: RateMatchDto,
    userId: string | null,
  ) {
    if (dto.rating === FeedbackRating.dislike && !dto.reason)
      throw new BadRequestException('Indica el motivo del dislike');
    const [match, property, client] = await Promise.all([
      this.prisma.propertyMatch.findUnique({
        where: { propertyId_clientId: { propertyId, clientId } },
      }),
      this.prisma.property.findUnique({
        where: { id: propertyId },
        select: propertyMatchSelect,
      }),
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: { interestDescription: true, notes: true },
      }),
    ]);
    if (!property || !client)
      throw new NotFoundException('Propiedad o cliente no encontrado');
    const author = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
      : null;
    const clientInterest = [client.interestDescription, client.notes]
      .map((t) => t?.trim())
      .filter(Boolean)
      .join(' | ');
    // Snapshot sin el texto libre (solo los datos que usó el matching).
    const summary = { ...toPropertyMatchData(property), text: undefined };

    return this.prisma.$transaction(async (tx) => {
      await tx.recommendationFeedback.updateMany({
        where: { propertyId, clientId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      const feedback = await tx.recommendationFeedback.create({
        data: {
          propertyId,
          clientId,
          userId: author?.id ?? null,
          rating: dto.rating,
          reason: dto.rating === FeedbackRating.dislike ? dto.reason : null,
          comment: dto.comment?.trim() || null,
          interestLevel: match ? TO_INTEREST_LEVEL[match.level] : null,
          aiReason: match?.explanation ?? null,
          clientInterest: clientInterest || null,
          propertySummary: summary as unknown as Prisma.InputJsonValue,
        },
      });
      if (dto.rating === FeedbackRating.dislike)
        await tx.propertyMatch.deleteMany({ where: { propertyId, clientId } });
      return { feedback, removed: dto.rating === FeedbackRating.dislike };
    });
  }

  /** Deshacer la calificación: un dislike deja de bloquear y se recalcula la propiedad. */
  async clearRating(propertyId: string, clientId: string) {
    const { count } = await this.prisma.recommendationFeedback.updateMany({
      where: { propertyId, clientId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0)
      throw new NotFoundException(
        'No hay una calificación activa para este cliente',
      );
    await this.matchEngine.recomputeProperty(propertyId);
    return { cleared: count };
  }

  /** Pasa una recomendación a interesado real (manual), con su nivel y explicación. */
  async registerInterest(propertyId: string, clientId: string) {
    const match = await this.prisma.propertyMatch.findUnique({
      where: { propertyId_clientId: { propertyId, clientId } },
    });
    if (!match) throw new NotFoundException('La recomendación ya no existe');
    const existing = await this.prisma.propertyInterest.findFirst({
      where: { propertyId, clientId },
    });
    if (existing) return existing;
    return this.prisma.propertyInterest.create({
      data: {
        propertyId,
        clientId,
        interestDate: new Date(),
        interestLevel: TO_INTEREST_LEVEL[match.level],
        notes: match.explanation,
        source: InterestSource.manual,
      },
    });
  }
}
