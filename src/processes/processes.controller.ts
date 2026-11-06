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
import { ProcessesService } from './processes.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';

@Controller('processes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @RequirePermission('processes', 'create')
  create(@Body() dto: CreateProcessDto) {
    return this.processesService.create(dto);
  }

  @Get()
  @RequirePermission('processes', 'access')
  findAllByProperty(@Query('propertyId') propertyId: string) {
    return this.processesService.findAllByProperty(propertyId);
  }

  @Get(':id')
  @RequirePermission('processes', 'view', { orActions: ['edit'] })
  findOne(@Param('id') id: string) {
    return this.processesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('processes', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateProcessDto) {
    return this.processesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('processes', 'delete')
  remove(@Param('id') id: string) {
    return this.processesService.remove(id);
  }
}
