import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('lanza 401 cuando el token está expirado', () => {
    const guard = new JwtAuthGuard();

    expect(() =>
      guard.handleRequest(null, null, { name: 'TokenExpiredError', message: 'jwt expired' }),
    ).toThrow(UnauthorizedException);
  });

  it('retorna el user cuando es válido', () => {
    const guard = new JwtAuthGuard();

    const user = { userId: '1' };
    const result = guard.handleRequest(null, user, undefined);

    expect(result).toEqual(user);
  });
});
