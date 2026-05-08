import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyRecommendationService } from './property-recommendation.service';
import { RecommendationQueueService } from './recommendation-queue.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertyRecommendationService,
    RecommendationQueueService,
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
