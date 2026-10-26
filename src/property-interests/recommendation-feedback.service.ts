import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
 * Calificaciones (like / dislike) de las recomendaciones. Se crean desde el motor de
 * recomendaciones (RecommendationsService.rate). Histórico de solo agregar: nunca se borra,
 * solo se marca `deletedAt`.
 */
@Injectable()
export class RecommendationFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

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
}
