import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SyncContactsService } from './sync-contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoogleToDbSyncDto } from './dto/google-to-db-sync.dto';
import { GoogleAuthCodeDto } from './dto/google-auth-code.dto';
import { GooglePreviewResponse } from './sync-contacts.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncContactsController {
  constructor(private readonly syncContactsService: SyncContactsService) {}

  @Get('google-auth-url')
  googleAuthUrl() {
    return this.syncContactsService.getGoogleAuthUrl();
  }

  @Post('google-auth-callback')
  googleAuthCallback(@Body() payload: GoogleAuthCodeDto) {
    return this.syncContactsService.exchangeGoogleAuthCode(payload.code);
  }

  @Get('google-preview')
  googlePreview(@Query('force') force?: string): Promise<GooglePreviewResponse> {
    return this.syncContactsService.getGooglePreview(force === 'true');
  }

  @Post('google-to-db')
  googleToDb(@Body() payload: GoogleToDbSyncDto) {
    return this.syncContactsService.syncGoogleToDb(payload);
  }

  @Post('db-to-google')
  dbToGoogle() {
    return this.syncContactsService.syncDbToGoogle();
  }

  @Delete('exclusions')
  clearExclusions() {
    return this.syncContactsService.clearExclusions();
  }
}
