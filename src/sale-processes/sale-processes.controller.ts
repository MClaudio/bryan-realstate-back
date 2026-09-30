import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SaleStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaleProcessesService } from './sale-processes.service';
import {
  UpdatePaymentMethodDto,
  UpdateSaleStageDto,
} from './dto/update-sale-process.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('sale-processes')
@UseGuards(JwtAuthGuard)
export class SaleProcessesController {
  constructor(private readonly saleProcessesService: SaleProcessesService) {}

  @Get()
  findAll() {
    return this.saleProcessesService.findAll();
  }

  @Get(':propertyId')
  findOne(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.saleProcessesService.findOne(propertyId);
  }

  @Patch(':propertyId')
  updatePaymentMethod(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.saleProcessesService.updatePaymentMethod(
      propertyId,
      dto.paymentMethod,
    );
  }

  @Patch(':propertyId/stages/:stage')
  updateStage(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('stage', new ParseEnumPipe(SaleStage)) stage: SaleStage,
    @Body() dto: UpdateSaleStageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.saleProcessesService.updateStage(
      propertyId,
      stage,
      dto,
      req.user.userId,
    );
  }
}
