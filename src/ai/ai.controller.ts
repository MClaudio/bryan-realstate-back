import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OpenAiUsageService } from './openai-usage.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly usageService: OpenAiUsageService) {}

  @Get('usage')
  usage() {
    return this.usageService.getSummary();
  }
}
