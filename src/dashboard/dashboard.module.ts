import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { FilesModule } from '../files/files.module'

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
