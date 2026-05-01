import { Module } from '@nestjs/common';
import { SyncContactsService } from './sync-contacts.service';
import { SyncContactsController } from './sync-contacts.controller';
import { GoogleContactsModule } from '../google-contacts/google-contacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExclusionService } from './exclusion.service';

@Module({
  imports: [GoogleContactsModule, PrismaModule],
  controllers: [SyncContactsController],
  providers: [SyncContactsService, ExclusionService],
  exports: [SyncContactsService],
})
export class SyncContactsModule {}
