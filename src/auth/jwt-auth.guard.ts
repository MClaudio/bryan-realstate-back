import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: { name?: string; message?: string } | undefined,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      this.logger.warn('JWT expirado');
      throw new UnauthorizedException('Token expirado');
    }

    if (err || !user) {
      if (info?.message) {
        this.logger.warn(`JWT inválido: ${info.message}`);
      }
      throw err ?? new UnauthorizedException();
    }

    return user as TUser;
  }
}
