import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { PropertiesModule } from './properties/properties.module';
import { FilesModule } from './files/files.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProcessesModule } from './processes/processes.module';
import { PropertyInterestsModule } from './property-interests/property-interests.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { GoogleContactsModule } from './google-contacts/google-contacts.module';
import { SyncContactsModule } from './sync-contacts/sync-contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    PropertiesModule,
    FilesModule,
    ConfigurationsModule,
    DashboardModule,
    ProcessesModule,
    PropertyInterestsModule,
    BlacklistModule,
    GoogleContactsModule,
    SyncContactsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
