import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PermissionsGuard } from './permissions.guard';

// Global: PermissionsGuard (que depende de ProfilesService) se usa en todos los controladores.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, PermissionsGuard],
  exports: [ProfilesService, PermissionsGuard],
})
export class ProfilesModule {}
