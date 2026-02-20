-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'ACCOUNTING', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('Casa', 'Terreno', 'Casa y terreno', 'Departamento', 'Finca', 'Lote');

-- CreateEnum
CREATE TYPE "Topography" AS ENUM ('Plano', 'Semiplano', 'Pendiente', 'Mixto');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('Rural', 'Urbano', 'Urbanización');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('Nuevo', 'Negociación', 'Vendido');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('image', 'document');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "ruc" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "has_changed_default_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "ruc" TEXT,
    "birth_date" DATE,
    "user_id" UUID,
    "last_login" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location_url" TEXT NOT NULL,
    "construction_area" DECIMAL(10,2) NOT NULL,
    "land_area" DECIMAL(10,2) NOT NULL,
    "has_basic_services" BOOLEAN NOT NULL DEFAULT false,
    "basic_services" JSONB NOT NULL,
    "features" TEXT,
    "property_type" "PropertyType" NOT NULL,
    "construction_years" INTEGER,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "topography" "Topography" NOT NULL,
    "zone" "Zone" NOT NULL,
    "city_time" INTEGER,
    "observations" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'Nuevo',
    "advisor_id" UUID NOT NULL,
    "owner" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "max_price" DECIMAL(12,2),
    "min_price" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(5,2) NOT NULL,
    "sale_price" DECIMAL(12,2),
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "facebook_url" TEXT,
    "tiktok_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" UUID NOT NULL,
    "logo_id" UUID,
    "company_name" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "facebook_profile" TEXT,
    "instagram_profile" TEXT,
    "youtube_profile" TEXT,
    "whatsapp_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_files" (
    "property_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "file_type" "FileType" NOT NULL,

    CONSTRAINT "property_files_pkey" PRIMARY KEY ("property_id","file_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_ruc_key" ON "users"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_logo_id_key" ON "configurations"("logo_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
