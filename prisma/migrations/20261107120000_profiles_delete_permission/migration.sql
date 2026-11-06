-- Nueva acción "delete" (eliminar). Los perfiles existentes la reciben con el mismo valor
-- que ya tenían en "edit" (hasta ahora eliminar se regía por editar), solo en los módulos
-- que soportan eliminar. El perfil ADMIN queda con todo en true.
UPDATE "profiles" p
SET "permissions" = (
  SELECT COALESCE(jsonb_object_agg(
    e.key,
    CASE
      WHEN e.key IN ('users', 'profiles', 'clients', 'properties', 'processes', 'files', 'blacklist')
        THEN e.value || jsonb_build_object(
          'delete',
          CASE WHEN p."is_system" THEN true ELSE COALESCE((e.value ->> 'edit')::boolean, false) END
        )
      ELSE e.value
    END
  ), '{}'::jsonb)
  FROM jsonb_each(p."permissions") AS e
),
"updated_at" = CURRENT_TIMESTAMP;
