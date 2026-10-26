import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import aiConfig from './ai.config';
import { ContactAiParserService } from './contact-ai-parser.service';
import { PropertyDescriptionAiService } from './property-description-ai.service';
import { ClientCriteriaAiService } from './client-criteria-ai.service';
import { OpenAiUsageService } from './openai-usage.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule.forFeature(aiConfig)],
  controllers: [AiController],
  providers: [
    ContactAiParserService,
    PropertyDescriptionAiService,
    ClientCriteriaAiService,
    OpenAiUsageService,
  ],
  exports: [ContactAiParserService, PropertyDescriptionAiService, ClientCriteriaAiService],
})
export class AiModule {}
