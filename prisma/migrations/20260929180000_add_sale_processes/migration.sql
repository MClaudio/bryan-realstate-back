-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Credito', 'Efectivo');

-- CreateEnum
CREATE TYPE "SaleStage" AS ENUM ('Sena', 'Cooperativa', 'Municipio', 'Notaria', 'Registro');

-- CreateEnum
CREATE TYPE "RegistryStatus" AS ENUM ('Ingreso', 'Devolutiva', 'Inscrita');

-- CreateTable
CREATE TABLE "sale_processes" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'Credito',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_process_stages" (
    "id" UUID NOT NULL,
    "sale_process_id" UUID NOT NULL,
    "stage" "SaleStage" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" UUID,
    "observation" TEXT,
    "total_value" DECIMAL(12,2),
    "deposit_amount" DECIMAL(12,2),
    "registry_status" "RegistryStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_process_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_processes_property_id_key" ON "sale_processes"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_process_stages_sale_process_id_stage_key" ON "sale_process_stages"("sale_process_id", "stage");

-- AddForeignKey
ALTER TABLE "sale_processes" ADD CONSTRAINT "sale_processes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_process_stages" ADD CONSTRAINT "sale_process_stages_sale_process_id_fkey" FOREIGN KEY ("sale_process_id") REFERENCES "sale_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_process_stages" ADD CONSTRAINT "sale_process_stages_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing (not soft-deleted) property gets a Credito process
-- with its 5 empty stages, so all of them show up at 0% in the Procesos module.
INSERT INTO "sale_processes" ("id", "property_id", "payment_method", "updated_at")
SELECT gen_random_uuid(), p."id", 'Credito', CURRENT_TIMESTAMP
FROM "properties" p
WHERE p."deleted_at" IS NULL;

INSERT INTO "sale_process_stages" ("id", "sale_process_id", "stage", "updated_at")
SELECT gen_random_uuid(), sp."id", s."stage", CURRENT_TIMESTAMP
FROM "sale_processes" sp
CROSS JOIN (
    VALUES ('Sena'::"SaleStage"), ('Cooperativa'::"SaleStage"), ('Municipio'::"SaleStage"),
           ('Notaria'::"SaleStage"), ('Registro'::"SaleStage")
) AS s("stage");
