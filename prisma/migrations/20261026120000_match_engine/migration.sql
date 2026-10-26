-- Nuevo motor de recomendaciones: criterios estructurados del cliente + matches calculados por reglas.

-- CreateEnum
CREATE TYPE "CriteriaIntent" AS ENUM ('COMPRA', 'VENDE', 'OTRO');

-- CreateEnum
CREATE TYPE "MatchLevel" AS ENUM ('ALTO', 'MEDIO', 'BAJO');

-- CreateTable
CREATE TABLE "client_criteria" (
    "client_id" UUID NOT NULL,
    "intent" "CriteriaIntent" NOT NULL DEFAULT 'COMPRA',
    "accepted_types" "PropertyType"[],
    "generic_type" BOOLEAN NOT NULL DEFAULT false,
    "accepted_cities" TEXT[],
    "excluded_cities" TEXT[],
    "accepted_sectors" TEXT[],
    "max_minutes_center" INTEGER,
    "near_center" BOOLEAN NOT NULL DEFAULT false,
    "min_land_m2" DECIMAL(12,2),
    "max_land_m2" DECIMAL(12,2),
    "min_construction_m2" DECIMAL(12,2),
    "min_budget_usd" DECIMAL(12,2),
    "max_budget_usd" DECIMAL(12,2),
    "topographies" "Topography"[],
    "zones" "Zone"[],
    "required_services" TEXT[],
    "uses" TEXT[],
    "wanted_features" TEXT[],
    "method" TEXT NOT NULL,
    "extractor_version" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "criteria_hash" TEXT NOT NULL,
    "matched_hash" TEXT,
    "ai_notes" TEXT,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_criteria_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "property_matches" (
    "property_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "level" "MatchLevel" NOT NULL,
    "score" INTEGER NOT NULL,
    "matched" TEXT[],
    "unconfirmed" TEXT[],
    "explanation" TEXT NOT NULL,
    "property_version" TEXT NOT NULL,
    "client_version" TEXT NOT NULL,
    "rules_version" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_matches_pkey" PRIMARY KEY ("property_id","client_id")
);

-- CreateIndex
CREATE INDEX "client_criteria_intent_idx" ON "client_criteria"("intent");

-- CreateIndex
CREATE INDEX "property_matches_property_id_score_idx" ON "property_matches"("property_id", "score" DESC);

-- CreateIndex
CREATE INDEX "property_matches_client_id_score_idx" ON "property_matches"("client_id", "score" DESC);

-- AddForeignKey
ALTER TABLE "client_criteria" ADD CONSTRAINT "client_criteria_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_matches" ADD CONSTRAINT "property_matches_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_matches" ADD CONSTRAINT "property_matches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Las recomendaciones pasan a property_matches: property_interests queda solo para interesados reales
-- (formulario / WhatsApp). Se quitan las que creó la IA: source = 'ia' y los lotes masivos del cron
-- anterior que la migración 20261004120000 dejó como 'manual' (5+ de la misma propiedad en menos
-- de 10 minutos, antes del 2026-10-04). Las que el equipo confirmó con like se conservan como manual.
CREATE TABLE "property_interests_backup_20261026" AS
SELECT pi.*
FROM "property_interests" pi
WHERE (
    pi."source" = 'ia'
    OR (
      pi."source" = 'manual'
      AND pi."created_at" < TIMESTAMP '2026-10-04 00:00:00'
      AND (
        SELECT COUNT(*)
        FROM "property_interests" o
        WHERE o."property_id" = pi."property_id"
          AND o."source" = 'manual'
          AND ABS(EXTRACT(EPOCH FROM (o."created_at" - pi."created_at"))) <= 600
      ) >= 5
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "recommendation_feedback" rf
    WHERE rf."property_id" = pi."property_id"
      AND rf."client_id" = pi."client_id"
      AND rf."rating" = 'like'
      AND rf."deleted_at" IS NULL
  );

DELETE FROM "property_interests"
WHERE "id" IN (SELECT "id" FROM "property_interests_backup_20261026");

UPDATE "property_interests" pi
SET "source" = 'manual'
WHERE pi."source" = 'ia';

-- recommendation_hash pasa a ser la huella de matching de la propiedad: se recalculan todas.
UPDATE "properties" SET "recommendation_hash" = NULL, "recommendation_run_at" = NULL;
