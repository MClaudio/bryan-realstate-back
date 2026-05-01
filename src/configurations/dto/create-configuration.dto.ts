import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class CreateConfigurationDto {
  @IsUUID()
  @IsOptional()
  logoId?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(13)
  ruc: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail({}, { message: 'email must be an email' })
  @ValidateIf((o) => o.email !== undefined && o.email !== '')
  @IsOptional()
  email?: string;

  @IsUrl({}, { message: 'facebookProfile must be a URL address' })
  @ValidateIf((o) => o.facebookProfile !== undefined && o.facebookProfile !== '')
  @IsOptional()
  facebookProfile?: string;

  @IsUrl({}, { message: 'instagramProfile must be a URL address' })
  @ValidateIf((o) => o.instagramProfile !== undefined && o.instagramProfile !== '')
  @IsOptional()
  instagramProfile?: string;

  @IsUrl({}, { message: 'youtubeProfile must be a URL address' })
  @ValidateIf((o) => o.youtubeProfile !== undefined && o.youtubeProfile !== '')
  @IsOptional()
  youtubeProfile?: string;

  @IsUrl({}, { message: 'whatsappLink must be a URL address' })
  @ValidateIf((o) => o.whatsappLink !== undefined && o.whatsappLink !== '')
  @IsOptional()
  whatsappLink?: string;
}