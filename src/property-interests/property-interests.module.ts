import { Module } from '@nestjs/common';
import { PropertyInterestsService } from './property-interests.service';
import { PropertyInterestsController } from './property-interests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyInterestsController],
  providers: [PropertyInterestsService],
})
export class PropertyInterestsModule {}
