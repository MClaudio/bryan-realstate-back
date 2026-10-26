import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyProposalService } from './property-proposal.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyInterestsModule } from '../property-interests/property-interests.module';
import { FilesModule } from '../files/files.module';
import { AiModule } from '../ai/ai.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    PropertyInterestsModule,
    FilesModule,
    AiModule,
    RecommendationsModule,
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyProposalService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
