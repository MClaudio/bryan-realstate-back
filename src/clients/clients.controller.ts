import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { NormalizeClientDto } from './dto/normalize-client.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermission('clients', 'create')
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Post('normalize')
  @RequirePermission('clients', 'access')
  normalize(@Body() normalizeClientDto: NormalizeClientDto) {
    return this.clientsService.normalize(normalizeClientDto);
  }

  @Get()
  @RequirePermission('clients', 'access')
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @RequirePermission('clients', 'view', { orActions: ['edit'] })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('clients', 'edit')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @RequirePermission('clients', 'delete')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
