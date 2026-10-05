import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PropertyInterestsService } from './property-interests.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { ReconcileRecommendationsDto } from './dto/reconcile-recommendations.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationFeedbackService } from './recommendation-feedback.service';
import { RateRecommendationDto } from './dto/rate-recommendation.dto';

@Controller('property-interests')
@UseGuards(JwtAuthGuard)
export class PropertyInterestsController {
  constructor(
    private readonly service: PropertyInterestsService,
    private readonly feedbackService: RecommendationFeedbackService,
  ) {}

  /** Calificaciones activas (like / dislike) de las recomendaciones IA de una propiedad. */
  @Get('feedback')
  getFeedback(@Query('propertyId') propertyId?: string) {
    if (!propertyId) throw new BadRequestException('propertyId es requerido');
    return this.feedbackService.getActiveForProperty(propertyId);
  }

  /** Deshacer una calificación (eliminado lógico: queda en el histórico). */
  @Delete('feedback')
  clearFeedback(
    @Query('propertyId') propertyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    if (!propertyId || !clientId)
      throw new BadRequestException('propertyId y clientId son requeridos');
    return this.feedbackService.clear(propertyId, clientId);
  }

  /** Like / dislike a una recomendación de la IA. */
  @Post(':id/feedback')
  rate(
    @Param('id') id: string,
    @Body() dto: RateRecommendationDto,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.feedbackService.rate(id, dto, req.user?.userId ?? null);
  }

  @Post()
  create(@Body() dto: CreatePropertyInterestDto) {
    return this.service.create(dto);
  }

  @Post('properties/:propertyId/reconcile')
  reconcileRecommendations(
    @Param('propertyId') propertyId: string,
    @Body() dto: ReconcileRecommendationsDto,
  ) {
    // Candidatos de la IA confirmados en la vista: reemplaza solo los de origen IA.
    return this.service.reconcileRecommendations(
      propertyId,
      dto.recommendations,
      { mode: 'replaceAi' },
    );
  }

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    if (propertyId) return this.service.findAllByProperty(propertyId);
    if (clientId) return this.service.findAllByClient(clientId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyInterestDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
