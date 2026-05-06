import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyRecommendationService } from './property-recommendation.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyRecommendationService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
