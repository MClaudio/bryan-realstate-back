import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyRecommendationService } from './property-recommendation.service';
import { RecommendationQueueService } from './recommendation-queue.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyInterestsModule } from '../property-interests/property-interests.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PropertyInterestsModule, FilesModule],
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
