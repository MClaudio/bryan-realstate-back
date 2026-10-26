import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { RateMatchDto } from './dto/rate-match.dto';
import { RecommendationsSchedulerService } from './recommendations-scheduler.service';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly service: RecommendationsService,
    private readonly scheduler: RecommendationsSchedulerService,
  ) {}

  /**
   * Sincroniza ahora (lo mismo que el cron): lee criterios de clientes nuevos o cambiados y
   * recalcula lo afectado. Sirve para la carga inicial tras desplegar.
   */
  @Post('sync')
  sync(@Req() req: { user?: { userId?: string } }) {
    // En segundo plano: con muchos clientes tarda más que el timeout de la petición.
    return this.scheduler.startInBackground(req.user?.userId ?? null);
  }

  /** Clientes recomendados (calculados por reglas) y descartados de una propiedad. */
  @Get('properties/:propertyId')
  listForProperty(@Param('propertyId') propertyId: string) {
    return this.service.listForProperty(propertyId);
  }

  /** Recalcula ahora los clientes de la propiedad (sin IA, tarda segundos). */
  @Post('properties/:propertyId/recompute')
  recomputeProperty(@Param('propertyId') propertyId: string) {
    return this.service.recomputeProperty(propertyId);
  }

  @Post('properties/:propertyId/clients/:clientId/feedback')
  rate(
    @Param('propertyId') propertyId: string,
    @Param('clientId') clientId: string,
    @Body() dto: RateMatchDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.service.rate(
      propertyId,
      clientId,
      dto,
      req.user?.userId ?? null,
    );
  }

  @Delete('properties/:propertyId/clients/:clientId/feedback')
  clearRating(
    @Param('propertyId') propertyId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.service.clearRating(propertyId, clientId);
  }

  /** Registra la recomendación como interesado real de la propiedad. */
  @Post('properties/:propertyId/clients/:clientId/interest')
  registerInterest(
    @Param('propertyId') propertyId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.service.registerInterest(propertyId, clientId);
  }

  /** Propiedades recomendadas para un cliente. */
  @Get('clients/:clientId')
  listForClient(@Param('clientId') clientId: string) {
    return this.service.listForClient(clientId);
  }

  /** Cómo se interpretó el interés del cliente (criterios estructurados). */
  @Get('clients/:clientId/criteria')
  getCriteria(@Param('clientId') clientId: string) {
    return this.service.getCriteria(clientId);
  }

  /** Vuelve a leer el interés del cliente y recalcula sus propiedades. */
  @Post('clients/:clientId/refresh')
  refreshClient(@Param('clientId') clientId: string) {
    return this.service.refreshClient(clientId);
  }
}
