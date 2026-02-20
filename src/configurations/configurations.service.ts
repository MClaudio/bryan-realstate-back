import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigurationsService {
  constructor(private prisma: PrismaService) {}

  async create(createConfigurationDto: CreateConfigurationDto) {
    const existingConfig = await this.prisma.configuration.findFirst();
    if (existingConfig) {
      // If one exists, we should probably update it or return it, 
      // but for now, let's allow creating if none exists, or fail.
      // Or maybe we treat this as "Upsert" logic in the controller/service.
      // Let's assume we can have only one config.
      throw new Error('Configuration already exists. Use update instead.');
    }

    return this.prisma.configuration.create({
      data: createConfigurationDto,
    });
  }

  async findOne() {
    const config = await this.prisma.configuration.findFirst({
      include: {
        logo: true,
      },
    });
    return config;
  }

  async update(updateConfigurationDto: UpdateConfigurationDto) {
    const existingConfig = await this.prisma.configuration.findFirst();
    
    if (!existingConfig) {
       // If no config exists, create it
       return this.prisma.configuration.create({
         data: updateConfigurationDto as CreateConfigurationDto,
       });
    }

    return this.prisma.configuration.update({
      where: { id: existingConfig.id },
      data: updateConfigurationDto,
    });
  }
}
