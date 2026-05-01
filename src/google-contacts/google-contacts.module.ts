import { Module } from '@nestjs/common';
import { GoogleContactsService } from './google-contacts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GoogleContactsService],
  exports: [GoogleContactsService],
})
export class GoogleContactsModule {}
