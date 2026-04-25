import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    if (createClientDto.email) {
      const existingClient = await this.prisma.client.findFirst({
        where: { email: createClientDto.email },
      });
      if (existingClient) {
        throw new ConflictException(`Client with email ${createClientDto.email} already exists`);
      }
    }

    const { password, ...clientData } = createClientDto;
    let passwordHash = undefined;

    if (password) {
      const salt = await bcrypt.genSalt();
      passwordHash = await bcrypt.hash(password, salt);
    }

    return this.prisma.client.create({
      data: {
        ...clientData,
        password: passwordHash,
      },
    });
  }

  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    const { password, ...updateData } = updateClientDto;
    const data: any = { ...updateData };

    if (password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(password, salt);
    }

    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    return this.prisma.client.delete({
      where: { id },
    });
  }
}
