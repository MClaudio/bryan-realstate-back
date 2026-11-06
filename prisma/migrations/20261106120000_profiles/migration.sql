-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_name_key" ON "profiles"("name");

-- AlterTable
ALTER TABLE "users" ADD COLUMN "profile_id" UUID;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Perfiles de sistema
WITH modules(key) AS (
  VALUES ('dashboard'), ('users'), ('profiles'), ('clients'), ('properties'),
         ('processes'), ('files'), ('blacklist'), ('configuration'),
         ('notifications'), ('ai')
),
full_perm AS (
  SELECT '{"access":true,"create":true,"edit":true,"view":true,"print":true,"download":true}'::jsonb AS p
)
INSERT INTO "profiles" ("id", "name", "description", "is_system", "permissions", "updated_at")
SELECT gen_random_uuid(), v.name, v.description, v.is_system,
       (SELECT jsonb_object_agg(m.key, f.p) FROM modules m, full_perm f
         WHERE v.admin_all OR m.key NOT IN ('users', 'profiles')),
       CURRENT_TIMESTAMP
FROM (VALUES
  ('ADMIN', 'Acceso total al sistema', true, true),
  ('CONTABILIDAD', 'Acceso a todos los módulos excepto Usuarios y Perfiles', false, false),
  ('EMPLEADO', 'Acceso a todos los módulos excepto Usuarios y Perfiles', false, false)
) AS v(name, description, is_system, admin_all);

-- Asignar perfil según el rol (type) actual
UPDATE "users" u SET "profile_id" = p."id"
FROM "profiles" p
WHERE (u."type" = 'ADMIN' AND p."name" = 'ADMIN')
   OR (u."type" = 'ACCOUNTING' AND p."name" = 'CONTABILIDAD')
   OR (u."type" = 'EMPLOYEE' AND p."name" = 'EMPLEADO');
