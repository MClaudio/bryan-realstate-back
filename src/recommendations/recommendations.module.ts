import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClientCriteriaService } from './client-criteria.service';
import { MatchEngineService } from './match-engine.service';
import { RecommendationNotifierService } from './recommendation-notifier.service';
import { RecommendationsQueueService } from './recommendations-queue.service';
import { RecommendationsSchedulerService } from './recommendations-scheduler.service';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

/**
 * Motor de recomendaciones: la IA solo interpreta intereses de clientes (cuando las reglas no
 * alcanzan); el emparejamiento es por reglas sobre datos estructurados en PostgreSQL.
 */
@Module({
  imports: [PrismaModule, AiModule, NotificationsModule],
  controllers: [RecommendationsController],
  providers: [
    ClientCriteriaService,
    MatchEngineService,
    RecommendationNotifierService,
    RecommendationsQueueService,
    RecommendationsSchedulerService,
    RecommendationsService,
  ],
  exports: [
    RecommendationsQueueService,
    MatchEngineService,
    ClientCriteriaService,
  ],
})
export class RecommendationsModule {}
