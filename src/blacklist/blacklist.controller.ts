import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('blacklist')
@UseGuards(JwtAuthGuard)
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Post()
  create(@Body() createBlacklistDto: CreateBlacklistDto) {
    return this.blacklistService.create(createBlacklistDto);
  }

  @Get()
  findAll() {
    return this.blacklistService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blacklistService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlacklistDto: UpdateBlacklistDto) {
    return this.blacklistService.update(id, updateBlacklistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blacklistService.remove(id);
  }
}
