import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
