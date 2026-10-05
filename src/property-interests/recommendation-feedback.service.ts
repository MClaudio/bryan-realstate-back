import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackRating, FeedbackReason, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildRecommendationProperty } from '../properties/recommendation-payload';
import { RateRecommendationDto } from './dto/rate-recommendation.dto';

/** Ejemplo compacto de una calificación, tal como se envía a la IA. */
export interface LearningExample {
  propiedad: string;
  busca: string;
  ia: string;
  motivo?: FeedbackReason;
  comentario?: string;
}

export interface LearningExamples {
  incorrectas: LearningExample[];
  correctas: LearningExample[];
}

const MAX_DISLIKE_EXAMPLES = 15;
const MAX_LIKE_EXAMPLES = 8;
const MAX_TEXT = 200;

const truncate = (value: string | null | undefined, max = MAX_TEXT) => {
  const text = value?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** "Terreno, Gualaceo, Nieves, 502 m², $50.000" a partir de la propiedad compacta. */
const describeProperty = (summary: unknown): string => {
  const p = (summary ?? {}) as Record<string, unknown>;
  const price =
    typeof p.precio === 'number'
      ? `$${String(Math.round(p.precio)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
      : null;
  const area = typeof p.terreno_m2 === 'number' ? `${p.terreno_m2} m²` : null;
  return [p.tipo, p.ciudad, p.sector, p.zona, area, price]
    .filter(Boolean)
    .join(', ');
};

const feedbackSelect = {
  id: true,
  propertyId: true,
  clientId: true,
  rating: true,
  reason: true,
  comment: true,
  interestLevel: true,
  aiReason: true,
  createdAt: true,
  client: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} satisfies Prisma.RecommendationFeedbackSelect;

/**
 * Calificaciones (like / dislike) de las recomendaciones de la IA.
 * - dislike: quita al cliente de los interesados y bloquea el par cliente+propiedad.
 * - like: confirma la recomendación; el botón "reevaluar" no la reemplaza.
 * Histórico de solo agregar: nunca se borra, solo se marca `deletedAt`.
 */
@Injectable()
export class RecommendationFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    interestId: string,
    dto: RateRecommendationDto,
    userId: string | null,
  ) {
    if (dto.rating === FeedbackRating.dislike && !dto.reason) {
      throw new BadRequestException('Indica el motivo del dislike');
    }

    const interest = await this.prisma.propertyInterest.findUnique({
      where: { id: interestId },
      include: {
        client: { select: { interestDescription: true, notes: true } },
        property: { include: { city: { select: { name: true } } } },
      },
    });
    if (!interest)
      throw new NotFoundException('Registro de interés no encontrado');

    // El token puede ser de un cliente: solo se registra el autor si es un usuario del sistema.
    const author = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
      : null;

    const clientInterest = [
      interest.client.interestDescription,
      interest.client.notes,
    ]
      .map((t) => t?.trim())
      .filter(Boolean)
      .join(' | ');

    const feedback = await this.prisma.$transaction(async (tx) => {
      await tx.recommendationFeedback.updateMany({
        where: {
          propertyId: interest.propertyId,
          clientId: interest.clientId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      const created = await tx.recommendationFeedback.create({
        data: {
          propertyId: interest.propertyId,
          clientId: interest.clientId,
          userId: author?.id ?? null,
          rating: dto.rating,
          reason: dto.rating === FeedbackRating.dislike ? dto.reason : null,
          comment: dto.comment?.trim() || null,
          interestLevel: interest.interestLevel,
          aiReason: interest.notes,
          clientInterest: clientInterest || null,
          propertySummary: buildRecommendationProperty(
            interest.property,
          ) as Prisma.InputJsonValue,
        },
        select: feedbackSelect,
      });

      // Dislike: sale de la lista de interesados (el historial queda en el snapshot del feedback).
      if (dto.rating === FeedbackRating.dislike) {
        await tx.propertyInterest.delete({ where: { id: interest.id } });
      }
      return created;
    });

    return { feedback, interestRemoved: dto.rating === FeedbackRating.dislike };
  }

  /** Deshacer: eliminado lógico de la calificación activa (un dislike deja de bloquear). */
  async clear(propertyId: string, clientId: string) {
    const { count } = await this.prisma.recommendationFeedback.updateMany({
      where: { propertyId, clientId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0)
      throw new NotFoundException(
        'No hay una calificación activa para este cliente',
      );
    return { cleared: count };
  }

  getActiveForProperty(propertyId: string) {
    return this.prisma.recommendationFeedback.findMany({
      where: { propertyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: feedbackSelect,
    });
  }

  /** Clientes con dislike activo para la propiedad (la IA no debe volver a recomendarlos). */
  async getBlockedClientIds(propertyId: string): Promise<string[]> {
    const rows = await this.prisma.recommendationFeedback.findMany({
      where: { propertyId, rating: FeedbackRating.dislike, deletedAt: null },
      select: { clientId: true },
    });
    return rows.map((r) => r.clientId);
  }

  /** Clientes con like activo para la propiedad (confirmados: la reevaluación no los toca). */
  async getLikedClientIds(propertyId: string): Promise<string[]> {
    const rows = await this.prisma.recommendationFeedback.findMany({
      where: { propertyId, rating: FeedbackRating.like, deletedAt: null },
      select: { clientId: true },
    });
    return rows.map((r) => r.clientId);
  }

  /** Últimas calificaciones de todas las propiedades, compactas, para el prompt de la IA. */
  async getLearningExamples(): Promise<LearningExamples> {
    const select = {
      rating: true,
      reason: true,
      comment: true,
      interestLevel: true,
      aiReason: true,
      clientInterest: true,
      propertySummary: true,
    } satisfies Prisma.RecommendationFeedbackSelect;

    const [dislikes, likes] = await Promise.all([
      this.prisma.recommendationFeedback.findMany({
        where: { rating: FeedbackRating.dislike, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: MAX_DISLIKE_EXAMPLES,
        select,
      }),
      this.prisma.recommendationFeedback.findMany({
        where: { rating: FeedbackRating.like, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: MAX_LIKE_EXAMPLES,
        select,
      }),
    ]);

    const toExample = (f: (typeof dislikes)[number]): LearningExample => {
      const example: LearningExample = {
        propiedad: describeProperty(f.propertySummary),
        busca: truncate(f.clientInterest),
        ia: truncate(
          `${f.interestLevel ?? ''}: ${f.aiReason ?? ''}`.replace(/^:\s*/, ''),
        ),
      };
      if (f.reason) example.motivo = f.reason;
      if (f.comment) example.comentario = truncate(f.comment);
      return example;
    };

    return {
      incorrectas: dislikes.map(toExample),
      correctas: likes.map(toExample),
    };
  }
}
