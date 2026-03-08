-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('Bajo', 'Medio', 'Alto', 'Muy Alto');

-- CreateTable
CREATE TABLE "property_interests" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "interest_date" DATE NOT NULL,
    "interest_level" "InterestLevel" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_interests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
