import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException, Req } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

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

  @Post(':id/recommendations')
  @UseGuards(JwtAuthGuard)
  recommendForProperty(@Param('id') id: string) {
    return this.propertiesService.recommendForProperty(id);
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
    return this.propertiesService.findAll();
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
