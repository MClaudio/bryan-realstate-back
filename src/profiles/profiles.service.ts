import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { MODULES, PermissionAction, ProfilePermissions, sanitizePermissions } from './permissions';

interface CachedProfile {
  isSystem: boolean;
  isActive: boolean;
  permissions: ProfilePermissions;
  expiresAt: number;
}

const CACHE_TTL_MS = 15_000;

@Injectable()
export class ProfilesService implements OnModuleInit {
  private readonly logger = new Logger(ProfilesService.name);
  private cache = new Map<string, CachedProfile>();

  constructor(private prisma: PrismaService) {}

  /** Garantiza que exista el perfil ADMIN con acceso total a todos los módulos del catálogo. */
  async onModuleInit() {
    try {
      const full: ProfilePermissions = {};
      for (const mod of MODULES) {
        full[mod.key] = Object.fromEntries(mod.actions.map((a) => [a, true]));
      }
      const admin = await this.prisma.profile.upsert({
        where: { name: 'ADMIN' },
        update: { permissions: full as any, isSystem: true, isActive: true },
        create: {
          name: 'ADMIN',
          description: 'Acceso total al sistema',
          isSystem: true,
          permissions: full as any,
        },
      });
      // Sincroniza los demás perfiles con el catálogo: quita módulos/acciones que ya no existen en modules.json.
      const others = await this.prisma.profile.findMany({ where: { isSystem: false } });
      for (const profile of others) {
        const clean = sanitizePermissions(profile.permissions);
        if (JSON.stringify(clean) !== JSON.stringify(profile.permissions)) {
          await this.prisma.profile.update({ where: { id: profile.id }, data: { permissions: clean as any } });
          this.logger.log(`Permisos del perfil "${profile.name}" sincronizados con modules.json`);
        }
      }
      // Todo usuario sin perfil asignado queda con el perfil ADMIN por defecto.
      const { count } = await this.prisma.user.updateMany({
        where: { profileId: null },
        data: { profileId: admin.id },
      });
      if (count > 0) this.logger.log(`Perfil ADMIN asignado a ${count} usuario(s) sin perfil`);
    } catch (error) {
      // No bloquear el arranque (p. ej. migración aún no aplicada).
      this.logger.error('No se pudo asegurar el perfil ADMIN', error as Error);
    }
  }

  getModules() {
    return MODULES;
  }

  /** Perfil efectivo del usuario (para login y /auth/me). */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { id: true, name: true, isSystem: true, isActive: true, permissions: true } } },
    });
    const profile = user?.profile;
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      isSystem: profile.isSystem,
      isActive: profile.isActive,
      // Se filtra contra el catálogo actual: un módulo/acción que ya no está en modules.json no cuenta.
      permissions: profile.isActive ? sanitizePermissions(profile.permissions) : {},
    };
  }

  async userCan(userId: string, module: string, action: PermissionAction): Promise<boolean> {
    const now = Date.now();
    let entry = this.cache.get(userId);
    if (!entry || entry.expiresAt < now) {
      const profile = await this.getUserProfile(userId);
      entry = {
        isSystem: profile?.isSystem ?? false,
        isActive: profile?.isActive ?? false,
        permissions: (profile?.permissions as ProfilePermissions) ?? {},
        expiresAt: now + CACHE_TTL_MS,
      };
      this.cache.set(userId, entry);
    }
    if (!entry.isActive) return false;
    if (entry.isSystem) return true;
    const perms = entry.permissions[module];
    return !!perms?.access && perms[action] === true;
  }

  invalidateCache() {
    this.cache.clear();
  }

  findAll() {
    return this.prisma.profile.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return profile;
  }

  async create(dto: CreateProfileDto) {
    const name = dto.name.trim();
    if (await this.prisma.profile.findUnique({ where: { name } })) {
      throw new ConflictException('Ya existe un perfil con ese nombre');
    }
    return this.prisma.profile.create({
      data: { name, description: dto.description, permissions: sanitizePermissions(dto.permissions) as any },
    });
  }

  async update(id: string, dto: UpdateProfileDto) {
    const profile = await this.findOne(id);
    if (profile.isSystem) throw new BadRequestException('Los perfiles de sistema no se pueden editar');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const dup = await this.prisma.profile.findUnique({ where: { name } });
      if (dup && dup.id !== id) throw new ConflictException('Ya existe un perfil con ese nombre');
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.permissions !== undefined) data.permissions = sanitizePermissions(dto.permissions);
    if (dto.isActive !== undefined) {
      if (dto.isActive === false && profile._count.users > 0) {
        throw new BadRequestException('No se puede desactivar un perfil con usuarios asignados');
      }
      data.isActive = dto.isActive;
    }

    const updated = await this.prisma.profile.update({ where: { id }, data });
    this.invalidateCache();
    return updated;
  }

  async remove(id: string) {
    const profile = await this.findOne(id);
    if (profile.isSystem) throw new BadRequestException('Los perfiles de sistema no se pueden eliminar');
    if (profile._count.users > 0) {
      throw new BadRequestException('No se puede eliminar un perfil con usuarios asignados');
    }
    await this.prisma.profile.delete({ where: { id } });
    this.invalidateCache();
    return { id };
  }
}
