import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import aiConfig from './ai.config';
import { ContactAiParserService } from './contact-ai-parser.service';
import { PropertyDescriptionAiService } from './property-description-ai.service';
import { PropertyRecommendationAiService } from './property-recommendation-ai.service';
import { OpenAiUsageService } from './openai-usage.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule.forFeature(aiConfig)],
  controllers: [AiController],
  providers: [
    ContactAiParserService,
    PropertyDescriptionAiService,
    PropertyRecommendationAiService,
    OpenAiUsageService,
  ],
  exports: [ContactAiParserService, PropertyDescriptionAiService, PropertyRecommendationAiService],
})
export class AiModule {}
