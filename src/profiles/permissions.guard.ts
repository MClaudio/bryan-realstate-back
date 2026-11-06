import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from './require-permission.decorator';
import { ProfilesService } from './profiles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profilesService: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (!userId) throw new ForbiddenException('No tienes acceso a este recurso');

    if (required.allowSelf && req.params?.id === userId) return true;

    const actions = [required.action, ...(required.orActions ?? [])];
    let allowed = false;
    for (const action of actions) {
      if (await this.profilesService.userCan(userId, required.module, action)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) throw new ForbiddenException('No tienes permiso para realizar esta acción');
    return true;
  }
}
