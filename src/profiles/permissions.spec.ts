import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSION_KEY } from './require-permission.decorator';
import { ProfilesService } from './profiles.service';
import { MODULE_KEYS, sanitizePermissions } from './permissions';

describe('sanitizePermissions', () => {
  it('descarta módulos y acciones inexistentes', () => {
    const result = sanitizePermissions({
      users: { access: true, create: true, hack: true },
      unknown: { access: true },
    });
    expect(Object.keys(result)).toEqual(['users']);
    expect(result.users).not.toHaveProperty('hack');
    expect(result.users.create).toBe(true);
  });

  it('sin acceso desactiva el resto de acciones', () => {
    const result = sanitizePermissions({ clients: { access: false, create: true, edit: true } });
    expect(Object.values(result.clients).every((v) => v === false)).toBe(true);
  });

  it('el catálogo incluye los módulos principales', () => {
    expect(MODULE_KEYS).toEqual(expect.arrayContaining(['dashboard', 'users', 'profiles', 'clients', 'properties']));
  });
});

describe('PermissionsGuard', () => {
  const makeContext = (user: any, params: any = {}) =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    }) as unknown as ExecutionContext;

  const makeGuard = (required: any, userCan: boolean) => {
    const reflector = { getAllAndOverride: jest.fn((key) => (key === PERMISSION_KEY ? required : undefined)) };
    const profiles = { userCan: jest.fn().mockResolvedValue(userCan) };
    return {
      guard: new PermissionsGuard(reflector as unknown as Reflector, profiles as unknown as ProfilesService),
      profiles,
    };
  };

  it('permite si no hay permiso requerido', async () => {
    const { guard } = makeGuard(undefined, false);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('permite si el perfil tiene el permiso', async () => {
    const { guard, profiles } = makeGuard({ module: 'users', action: 'create' }, true);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
    expect(profiles.userCan).toHaveBeenCalledWith('u1', 'users', 'create');
  });

  it('responde 403 si falta el permiso', async () => {
    const { guard } = makeGuard({ module: 'users', action: 'create' }, false);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('orActions permite si tiene cualquiera de las acciones', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'clients', action: 'view', orActions: ['edit'] }),
    };
    const profiles = { userCan: jest.fn(async (_u: string, _m: string, a: string) => a === 'edit') };
    const guard = new PermissionsGuard(reflector as unknown as Reflector, profiles as unknown as ProfilesService);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('allowSelf permite operar sobre el propio id', async () => {
    const { guard, profiles } = makeGuard({ module: 'users', action: 'edit', allowSelf: true }, false);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }, { id: 'u1' }))).resolves.toBe(true);
    expect(profiles.userCan).not.toHaveBeenCalled();
    await expect(guard.canActivate(makeContext({ userId: 'u1' }, { id: 'u2' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
