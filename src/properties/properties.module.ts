import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyRecommendationService } from './property-recommendation.service';
import { RecommendationQueueService } from './recommendation-queue.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyInterestsModule } from '../property-interests/property-interests.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PropertyInterestsModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertyRecommendationService,
    RecommendationQueueService,
  ],
  exports: [
    PropertiesService,
    PropertyRecommendationService,
    RecommendationQueueService,
  ],
})
export class PropertiesModule {}
