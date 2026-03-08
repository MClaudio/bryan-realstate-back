import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';

@Injectable()
export class BlacklistService {
  constructor(private prisma: PrismaService) {}

  async create(createBlacklistDto: CreateBlacklistDto) {
    return this.prisma.blacklist.create({ data: createBlacklistDto });
  }

  async findAll() {
    return this.prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const entry = await this.prisma.blacklist.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Blacklist entry with ID ${id} not found`);
    return entry;
  }

  async update(id: string, updateBlacklistDto: UpdateBlacklistDto) {
    await this.findOne(id);
    return this.prisma.blacklist.update({ where: { id }, data: updateBlacklistDto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.blacklist.delete({ where: { id } });
  }
}
