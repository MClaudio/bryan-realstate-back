import { Module } from '@nestjs/common';
import { PropertyInterestsService } from './property-interests.service';
import { PropertyInterestsController } from './property-interests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationFeedbackService } from './recommendation-feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyInterestsController],
  providers: [PropertyInterestsService, RecommendationFeedbackService],
  exports: [PropertyInterestsService, RecommendationFeedbackService],
})
export class PropertyInterestsModule {}
