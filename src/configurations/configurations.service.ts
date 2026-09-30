import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class ConfigurationsService {
  constructor(
    private prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  private async enrichLogo(config: any): Promise<any> {
    if (config?.logo) {
      return { ...config, logo: await this.filesService.enrichFile(config.logo) };
    }
    return config;
  }

  async create(createConfigurationDto: CreateConfigurationDto) {
    const existingConfig = await this.prisma.configuration.findFirst();
    if (existingConfig) {
      throw new Error('Configuration already exists. Use update instead.');
    }
    const raw = await this.prisma.configuration.create({
      data: createConfigurationDto,
      include: { logo: true },
    });
    return this.enrichLogo(raw);
  }

  async findOne() {
    const config = await this.prisma.configuration.findFirst({
      include: {
        logo: true,
      },
    });
    return this.enrichLogo(config);
  }

  async update(updateConfigurationDto: UpdateConfigurationDto) {
    const existingConfig = await this.prisma.configuration.findFirst();
    
    if (!existingConfig) {
       const created = await this.prisma.configuration.create({
         data: updateConfigurationDto as CreateConfigurationDto,
         include: { logo: true },
       });
       return this.enrichLogo(created);
    }

    const updated = await this.prisma.configuration.update({
      where: { id: existingConfig.id },
      data: updateConfigurationDto,
      include: { logo: true },
    });
    return this.enrichLogo(updated);
  }
}
