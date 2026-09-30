import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod, RegistryStatus } from '@prisma/client';

export class UpdatePaymentMethodDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

/** `null` clears a field; an omitted field keeps its current value. */
export class UpdateSaleStageDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observation?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalValue?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number | null;

  @IsOptional()
  @IsEnum(RegistryStatus)
  registryStatus?: RegistryStatus | null;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
