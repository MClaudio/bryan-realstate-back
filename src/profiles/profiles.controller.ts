import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';

@Controller('profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // Catálogo: lo necesita cualquier usuario con acceso a Perfiles o Usuarios (select de perfil).
  @Get('modules')
  getModules() {
    return this.profilesService.getModules();
  }

  // Listado sin permiso específico: alimenta el select de perfil de Usuarios y la página de Perfiles.
  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  @RequirePermission('profiles', 'view', { orActions: ['edit'] })
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Post()
  @RequirePermission('profiles', 'create')
  create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('profiles', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('profiles', 'delete')
  remove(@Param('id') id: string) {
    return this.profilesService.remove(id);
  }
}
