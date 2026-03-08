import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string
}
