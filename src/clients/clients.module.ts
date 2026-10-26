import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SyncContactsModule } from '../sync-contacts/sync-contacts.module';
import { AiModule } from '../ai/ai.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [PrismaModule, SyncContactsModule, AiModule, RecommendationsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
