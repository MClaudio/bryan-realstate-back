import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';

@Controller('blacklist')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Post()
  @RequirePermission('blacklist', 'create')
  create(@Body() createBlacklistDto: CreateBlacklistDto) {
    return this.blacklistService.create(createBlacklistDto);
  }

  @Get()
  @RequirePermission('blacklist', 'access')
  findAll() {
    return this.blacklistService.findAll();
  }

  @Get(':id')
  @RequirePermission('blacklist', 'view', { orActions: ['edit'] })
  findOne(@Param('id') id: string) {
    return this.blacklistService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('blacklist', 'edit')
  update(@Param('id') id: string, @Body() updateBlacklistDto: UpdateBlacklistDto) {
    return this.blacklistService.update(id, updateBlacklistDto);
  }

  @Delete(':id')
  @RequirePermission('blacklist', 'delete')
  remove(@Param('id') id: string) {
    return this.blacklistService.remove(id);
  }
}
