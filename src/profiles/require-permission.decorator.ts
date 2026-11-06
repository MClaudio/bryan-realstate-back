import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from './permissions';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
  /** Si es true, el usuario también pasa cuando `req.params.id` es su propio id. */
  allowSelf?: boolean;
  /** Acciones alternativas: basta con tener la principal o cualquiera de estas (p. ej. ver o editar). */
  orActions?: PermissionAction[];
}

/** Exige que el perfil del usuario tenga `action` sobre `module`. Usar junto a JwtAuthGuard + PermissionsGuard. */
export const RequirePermission = (module: string, action: PermissionAction, options?: { allowSelf?: boolean; orActions?: PermissionAction[] }) =>
  SetMetadata(PERMISSION_KEY, { module, action, allowSelf: options?.allowSelf, orActions: options?.orActions } as RequiredPermission);
