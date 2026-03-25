import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  /** Resolves a Google Maps short/full URL and returns extracted lat/lng */
  @Get('resolve-maps-url')
  //@UseGuards(JwtAuthGuard)
  async resolveMapsUrl(@Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param is required');
    return this.propertiesService.resolveMapsUrl(url);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
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
  update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}