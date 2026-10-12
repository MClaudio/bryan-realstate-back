import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneratePropertyDescriptionsDto } from './dto/generate-property-descriptions.dto';
import { PropertyProposalService } from './property-proposal.service';

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly proposalService: PropertyProposalService,
  ) { }

  private getUserId(req: any): string {
    return String(req?.user?.userId ?? '');
  }

  /** Resolves a Google Maps short/full URL and returns extracted lat/lng */
  @Get('resolve-maps-url')
  //@UseGuards(JwtAuthGuard)
  async resolveMapsUrl(@Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param is required');
    return this.propertiesService.resolveMapsUrl(url);
  }

  /** Genera con IA la descripción corta y larga pública con los datos del formulario (no guarda). */
  @Post('generate-descriptions')
  @UseGuards(JwtAuthGuard)
  generateDescriptions(@Body() dto: GeneratePropertyDescriptionsDto) {
    return this.propertiesService.generatePublicDescriptions(dto);
  }

  @Post(':id/recommendations')
  @UseGuards(JwtAuthGuard)
  recommendForProperty(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body?: { enqueue?: boolean; persist?: boolean },
  ) {
    // Background by default: a synchronous run with many clients outlasts the HTTP timeout.
    const enqueue = body?.enqueue !== false;
    const persist = body?.persist === false ? false : true;
    const userId = this.getUserId(req);
    return this.propertiesService.recommendForProperty(id, {
      enqueue,
      persist,
      userId,
    });
  }

  /** Latest stored AI recommendation that can be restored without calling n8n. */
  @Get(':id/recommendations/last')
  @UseGuards(JwtAuthGuard)
  lastRecommendation(@Param('id') id: string) {
    return this.propertiesService.lastRecommendationInfo(id);
  }

  @Post(':id/recommendations/restore-last')
  @UseGuards(JwtAuthGuard)
  restoreLastRecommendation(@Param('id') id: string) {
    return this.propertiesService.restoreLastRecommendation(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPropertyDto: CreatePropertyDto, @Req() req: any) {
    return this.propertiesService.create(createPropertyDto, this.getUserId(req));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get('public')
  findAllPublic() {
    return this.propertiesService.findAllPublic();
  }

  @Get('featured')
  findFeatured() {
    return this.propertiesService.findFeatured();
  }

  @Get('cities')
  @UseGuards(JwtAuthGuard)
  findCities() {
    return this.propertiesService.findCities();
  }

  @Get('current-sequence')
  @UseGuards(JwtAuthGuard)
  getCurrentSequence() {
    return this.propertiesService.getCurrentSequence();
  }

  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.propertiesService.findOnePublic(id);
  }

  /** PDF de propuesta de valor para el cliente (solo datos públicos, sin mapa ni redes). */
  @Get(':id/proposal-pdf')
  @UseGuards(JwtAuthGuard)
  async proposalPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.proposalService.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto, @Req() req: any) {
    return this.propertiesService.update(id, updatePropertyDto, this.getUserId(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}
