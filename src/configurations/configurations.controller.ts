import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('configuration')
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createConfigurationDto: CreateConfigurationDto) {
    return this.configurationsService.create(createConfigurationDto);
  }

  @Get()
  find() {
    return this.configurationsService.findOne();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  update(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configurationsService.update(updateConfigurationDto);
  }
}
