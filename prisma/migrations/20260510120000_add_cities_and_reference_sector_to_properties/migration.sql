-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "properties"
ADD COLUMN "city_id" UUID,
ADD COLUMN "reference_sector" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE INDEX "properties_city_id_idx" ON "properties"("city_id");

-- Seed initial cities
INSERT INTO "cities" ("id", "name", "created_at", "updated_at") VALUES
('a1f9d6b1-7d8b-4d86-9caa-67f6e0c6a001', 'Cuenca', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('a1f9d6b1-7d8b-4d86-9caa-67f6e0c6a002', 'Gualaceo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('a1f9d6b1-7d8b-4d86-9caa-67f6e0c6a003', 'Paute', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('a1f9d6b1-7d8b-4d86-9caa-67f6e0c6a004', 'Chordeleg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('a1f9d6b1-7d8b-4d86-9caa-67f6e0c6a005', 'Sigsig', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AddForeignKey
ALTER TABLE "properties"
ADD CONSTRAINT "properties_city_id_fkey"
FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
