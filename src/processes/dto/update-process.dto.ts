import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessDto } from './create-process.dto';
import { IsOptional } from 'class-validator';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
  @IsOptional()
  propertyId?: string;
}
