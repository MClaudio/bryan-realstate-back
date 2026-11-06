import modulesCatalog from './modules.json';

export const PERMISSION_ACTIONS = ['access', 'create', 'edit', 'delete', 'view', 'print', 'download'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface ModuleDef {
  key: string;
  label: string;
  path: string;
  icon: string;
  inMenu: boolean;
  order: number;
  actions: PermissionAction[];
}

export type ModulePermissions = Partial<Record<PermissionAction, boolean>>;
export type ProfilePermissions = Record<string, ModulePermissions>;

export const MODULES = modulesCatalog as ModuleDef[];
export const MODULE_KEYS = MODULES.map((m) => m.key);

/** Deja solo módulos y acciones válidas del catálogo, con booleanos estrictos. */
export function sanitizePermissions(input: unknown): ProfilePermissions {
  const result: ProfilePermissions = {};
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  for (const mod of MODULES) {
    const raw = source[mod.key];
    if (!raw || typeof raw !== 'object') continue;
    const perms: ModulePermissions = {};
    for (const action of mod.actions) {
      perms[action] = raw[action] === true;
    }
    // Sin "access" no hay ningún otro permiso.
    if (!perms.access) {
      for (const action of mod.actions) perms[action] = false;
    }
    result[mod.key] = perms;
  }
  return result;
}
