import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PrismaModule,
    PassportModule,
    // Rate limit para /auth/login (se aplica con ThrottlerGuard en el controller).
    // Configurable vía LOGIN_RATE_LIMIT (intentos) y LOGIN_RATE_TTL_MS (ventana).
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'login',
            limit: Number(configService.get<string>('LOGIN_RATE_LIMIT')) || 5,
            ttl: Number(configService.get<string>('LOGIN_RATE_TTL_MS')) || 60_000,
          },
        ],
        errorMessage:
          'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.',
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1d') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
