import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { InterestLevel } from '@prisma/client';

export class CreatePropertyInterestDto {
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsDateString()
  @IsNotEmpty()
  interestDate: string;

  @IsEnum(InterestLevel)
  interestLevel: InterestLevel;

  @IsString()
  @IsOptional()
  notes?: string;
}
