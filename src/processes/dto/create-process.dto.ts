import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessType } from '@prisma/client';

export class ExpenseDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateProcessDto {
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ProcessType)
  type: ProcessType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseDto)
  expenses?: ExpenseDto[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  fileIds?: string[];

  @IsString()
  @IsOptional()
  approximateTime?: string;

  @IsString()
  @IsOptional()
  nextStep?: string;
}
