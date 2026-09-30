import { Module } from '@nestjs/common';
import { PropertyChecklistService } from './property-checklist.service';
import { PropertyChecklistController } from './property-checklist.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyChecklistController],
  providers: [PropertyChecklistService],
})
export class PropertyChecklistModule {}
