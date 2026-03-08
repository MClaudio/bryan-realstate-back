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
} from '@nestjs/common';
import { PropertyInterestsService } from './property-interests.service';
import { CreatePropertyInterestDto } from './dto/create-property-interest.dto';
import { UpdatePropertyInterestDto } from './dto/update-property-interest.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('property-interests')
@UseGuards(JwtAuthGuard)
export class PropertyInterestsController {
  constructor(private readonly service: PropertyInterestsService) {}

  @Post()
  create(@Body() dto: CreatePropertyInterestDto) {
    return this.service.create(dto);
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
