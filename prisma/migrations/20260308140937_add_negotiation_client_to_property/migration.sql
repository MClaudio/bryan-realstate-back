-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "negotiation_client_id" UUID;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_negotiation_client_id_fkey" FOREIGN KEY ("negotiation_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
