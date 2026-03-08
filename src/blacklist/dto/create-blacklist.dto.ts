import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBlacklistDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
