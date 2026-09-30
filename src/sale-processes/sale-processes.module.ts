import { Module } from '@nestjs/common';
import { SaleProcessesService } from './sale-processes.service';
import { SaleProcessesController } from './sale-processes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaleProcessesController],
  providers: [SaleProcessesService],
})
export class SaleProcessesModule {}
