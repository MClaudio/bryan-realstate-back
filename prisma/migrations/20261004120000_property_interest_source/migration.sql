-- Origen del interesado: manual (formulario, WhatsApp) o ia (recomendación automática)
CREATE TYPE "InterestSource" AS ENUM ('manual', 'ia');

ALTER TABLE "property_interests"
ADD COLUMN "source" "InterestSource" NOT NULL DEFAULT 'manual';

-- Backfill: son de la IA los que aparecen como candidatos en alguna notificación de esa propiedad.
-- Los creados por el cron anterior no guardaban candidatos: quedan como manual (no se borrarán).
UPDATE "property_interests" pi
SET "source" = 'ia'
WHERE EXISTS (
  SELECT 1
  FROM "notifications" n
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(n."payload"::jsonb -> 'candidates') = 'array'
         THEN n."payload"::jsonb -> 'candidates'
         ELSE '[]'::jsonb END
  ) AS cand
  WHERE n."entity_type" = 'property'
    AND n."entity_id" = pi."property_id"::text
    AND cand ->> 'client_id' = pi."client_id"::text
);
