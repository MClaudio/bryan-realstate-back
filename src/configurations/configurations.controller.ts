import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';

@Controller('configuration')
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Post()
  @RequirePermission('configuration', 'edit')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  create(@Body() createConfigurationDto: CreateConfigurationDto) {
    return this.configurationsService.create(createConfigurationDto);
  }

  @Get()
  find() {
    return this.configurationsService.findOne();
  }

  @Patch()
  @RequirePermission('configuration', 'edit')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  update(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configurationsService.update(updateConfigurationDto);
  }
}
