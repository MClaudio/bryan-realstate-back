import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesService } from '../profiles/profiles.service';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Post()
  @RequirePermission('users', 'create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermission('users', 'access')
  findAll() {
    return this.usersService.findAll();
  }

  // Lista mínima (id y nombre) para elegir asesor en otros módulos: solo requiere sesión, no acceso a Usuarios.
  @Get('advisors')
  findAdvisors() {
    return this.usersService.findAdvisors();
  }

  @Get(':id')
  @RequirePermission('users', 'view', { allowSelf: true, orActions: ['edit'] })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users', 'edit', { allowSelf: true })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    // Editando su propio perfil sin permiso sobre Usuarios: no puede cambiarse rol, perfil ni estado.
    if (req.user?.userId === id && !(await this.profilesService.userCan(id, 'users', 'edit'))) {
      const { type, profileId, isActive, ...own } = updateUserDto as any;
      return this.usersService.update(id, own);
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  updatePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.usersService.changePassword(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermission('users', 'delete')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
