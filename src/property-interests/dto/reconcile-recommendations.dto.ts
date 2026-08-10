import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { InterestLevel } from '@prisma/client';

export class ReconcileInterestItemDto {
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsEnum(InterestLevel)
  @IsOptional()
  interestLevel?: InterestLevel;

  @IsString()
  @IsOptional()
  interest_level?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  interestDate?: string;
}

export class ReconcileRecommendationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconcileInterestItemDto)
  recommendations: ReconcileInterestItemDto[];
}
