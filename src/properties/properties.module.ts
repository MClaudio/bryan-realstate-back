import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyRecommendationService } from './property-recommendation.service';
import { RecommendationQueueService } from './recommendation-queue.service';
import { RecommendationRunnerService } from './recommendation-runner.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyInterestsModule } from '../property-interests/property-interests.module';
import { FilesModule } from '../files/files.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PropertyInterestsModule, FilesModule, AiModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertyRecommendationService,
    RecommendationQueueService,
    RecommendationRunnerService,
  ],
  exports: [
    PropertiesService,
    PropertyRecommendationService,
    RecommendationQueueService,
    RecommendationRunnerService,
  ],
})
export class PropertiesModule {}
