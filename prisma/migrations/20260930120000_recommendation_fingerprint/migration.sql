-- Huella para no recalcular recomendaciones si la propiedad no cambió
ALTER TABLE "properties"
ADD COLUMN "recommendation_hash" TEXT,
ADD COLUMN "recommendation_run_at" TIMESTAMP(3);

-- Marca de cambio de intereses del cliente (independiente de updated_at,
-- que la sincronización con Google toca en cada pasada)
ALTER TABLE "clients"
ADD COLUMN "interest_updated_at" TIMESTAMP(3);

UPDATE "clients" SET "interest_updated_at" = "created_at";

CREATE OR REPLACE FUNCTION set_client_interest_updated_at() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW."interest_description" IS DISTINCT FROM OLD."interest_description"
     OR NEW."notes" IS DISTINCT FROM OLD."notes" THEN
    NEW."interest_updated_at" := (now() AT TIME ZONE 'UTC');
  ELSE
    NEW."interest_updated_at" := OLD."interest_updated_at";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "clients_interest_updated_at" ON "clients";
CREATE TRIGGER "clients_interest_updated_at"
BEFORE INSERT OR UPDATE ON "clients"
FOR EACH ROW EXECUTE FUNCTION set_client_interest_updated_at();
