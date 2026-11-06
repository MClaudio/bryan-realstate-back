import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
          { ruc: createUserDto.ruc },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Usuario, email o RUC ya existen');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const { password, ...userData } = createUserDto;

    // Sin perfil explícito, se asigna el perfil ADMIN por defecto.
    if (!userData.profileId) {
      const profile = await this.prisma.profile.findUnique({ where: { name: 'ADMIN' } });
      userData.profileId = profile?.id;
    } else {
      await this.assertProfileUsable(userData.profileId);
    }

    const created = await this.prisma.user.create({
      data: {
        ...userData,
        password: passwordHash,
      },
    });
    const { password: _hash, resetPasswordToken, resetPasswordExpires, ...safe } = created;
    return safe;
  }

  private async assertProfileUsable(profileId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || !profile.isActive) {
      throw new BadRequestException('El perfil seleccionado no existe o está inactivo');
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        address: true,
        ruc: true,
        type: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
        isActive: true,
        hasChangedDefaultPassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** Usuarios activos con solo id y nombre; sirve para seleccionar asesor sin exponer datos de Usuarios. */
  async findAdvisors() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...result } = user;
    return result;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if (updateUserDto.profileId) await this.assertProfileUsable(updateUserDto.profileId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...updateUserDto },
    });
    const { password: _hash, resetPasswordToken, resetPasswordExpires, ...safe } = updated;
    return safe;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, requester: { sub: string; type: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    const isAdmin = requester?.type === 'ADMIN';
    const isSelf = requester?.sub === id;
    if (!isAdmin && !isSelf) {
      throw new NotFoundException(`You are not allowed to change this password`);
    }

    if (!isAdmin) {
      if (!dto.currentPassword) {
        throw new ConflictException('La contraseña actual es requerida');
      }
      const match = await bcrypt.compare(dto.currentPassword, user.password);
      if (!match) {
        throw new ConflictException('La contraseña actual es incorrecta');
      }
    }

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(dto.newPassword, salt);

    return this.prisma.user.update({
      where: { id },
      data: { password: newHash, hasChangedDefaultPassword: true },
      select: { id: true, username: true, hasChangedDefaultPassword: true, updatedAt: true },
    });
  }
}
