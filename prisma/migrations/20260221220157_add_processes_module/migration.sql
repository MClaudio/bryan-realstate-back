-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('Comprador', 'Vendedor');

-- CreateTable
CREATE TABLE "processes" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProcessType" NOT NULL,
    "description" TEXT NOT NULL,
    "expenses" JSONB NOT NULL DEFAULT '[]',
    "approximate_time" TEXT,
    "next_step" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_files" (
    "process_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_files_pkey" PRIMARY KEY ("process_id","file_id")
);

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_files" ADD CONSTRAINT "process_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_files" ADD CONSTRAINT "process_files_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
