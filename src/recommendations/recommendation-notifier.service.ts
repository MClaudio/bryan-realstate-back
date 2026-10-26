import { Injectable, Logger } from '@nestjs/common';
import { NotificationActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { RecomputeSummary } from './match-engine.service';

/** Avisa al asesor cuando una propiedad gana clientes recomendados en ALTO. */
@Injectable()
export class RecommendationNotifierService {
  private readonly logger = new Logger(RecommendationNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async notifyPropertyRecompute(
    propertyId: string,
    summary: RecomputeSummary,
    trigger: 'create' | 'update' | 'manual' | 'scheduler',
    userId: string | null,
  ): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { code: true, advisorId: true },
    });
    if (!property) return;
    const recipient = trigger === 'manual' ? userId : property.advisorId;
    // Automático: solo se avisa si hay nuevos ALTO. Manual: siempre se informa el resultado.
    if (!recipient || (trigger !== 'manual' && summary.newAlto.length === 0))
      return;
    const alto = summary.newAlto.length;
    const message =
      trigger === 'manual'
        ? `Propiedad ${property.code}: ${summary.total} cliente(s) recomendados (${summary.created} nuevo(s), ${summary.deleted} quitado(s)).`
        : `Propiedad ${property.code}: ${alto} cliente(s) nuevo(s) que coinciden en todo (ALTO).`;
    await this.send(
      recipient,
      'Recomendaciones actualizadas',
      message,
      propertyId,
      {
        trigger,
        summary,
      },
    );
  }

  /** Un cliente cambió su interés y ahora es ALTO para estas propiedades. */
  async notifyNewAltoForClient(
    clientId: string,
    propertyIds: string[],
  ): Promise<void> {
    if (propertyIds.length === 0) return;
    const [client, properties] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, code: true, advisorId: true },
      }),
    ]);
    const name =
      `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim() ||
      'Un cliente';
    for (const property of properties) {
      await this.send(
        property.advisorId,
        'Nuevo cliente recomendado (ALTO)',
        `${name} coincide en todo con la propiedad ${property.code}.`,
        property.id,
        { trigger: 'client', clientId },
      );
    }
  }

  private async send(
    userId: string,
    title: string,
    message: string,
    propertyId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.notifications.createForUser({
        userId,
        title,
        message,
        path: `/admin/propiedades/ver/${propertyId}`,
        actionType: NotificationActionType.NAVIGATE,
        entityType: 'property',
        entityId: propertyId,
        payload: { propertyId, kind: 'matches', ...payload },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo notificar a ${userId} (propiedad ${propertyId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
