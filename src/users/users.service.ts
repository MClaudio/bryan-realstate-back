import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

    return this.prisma.user.create({
      data: {
        ...userData,
        password: passwordHash,
      },
    });
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
        hasChangedDefaultPassword: true,
        createdAt: true,
        updatedAt: true,
      },
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

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(updateUserDto.password, salt);
      data.hasChangedDefaultPassword = true;
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    return this.prisma.user.delete({
      where: { id },
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
