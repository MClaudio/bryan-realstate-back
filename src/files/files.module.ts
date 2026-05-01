import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PublicFilesController } from './public-files.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [FilesController, PublicFilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
