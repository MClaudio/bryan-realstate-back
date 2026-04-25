-- DropForeignKey
ALTER TABLE "property_files" DROP CONSTRAINT "property_files_file_id_fkey";

-- DropForeignKey
ALTER TABLE "property_files" DROP CONSTRAINT "property_files_property_id_fkey";

-- DropIndex
DROP INDEX "properties_code_key";

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "property_files" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "properties_code_idx" ON "properties"("code");

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
