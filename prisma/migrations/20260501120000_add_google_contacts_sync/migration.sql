-- AlterTable
ALTER TABLE "clients"
ADD COLUMN "google_contact_id" TEXT,
ADD COLUMN "google_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "google_auth_tokens" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'google',
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" TEXT,
  "scope" TEXT,
  "expiry_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "google_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_sync_exclusions" (
  "id" UUID NOT NULL,
  "google_contact_id" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contact_sync_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_sync_logs" (
  "id" UUID NOT NULL,
  "direction" TEXT NOT NULL,
  "imported_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_count" INTEGER NOT NULL DEFAULT 0,
  "excluded_count" INTEGER NOT NULL DEFAULT 0,
  "invalid_count" INTEGER NOT NULL DEFAULT 0,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contact_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_google_contact_id_key" ON "clients"("google_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_auth_tokens_provider_key" ON "google_auth_tokens"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "contact_sync_exclusions_google_contact_id_key" ON "contact_sync_exclusions"("google_contact_id");

-- CreateIndex
CREATE INDEX "contact_sync_exclusions_email_idx" ON "contact_sync_exclusions"("email");

-- CreateIndex
CREATE INDEX "contact_sync_exclusions_phone_idx" ON "contact_sync_exclusions"("phone");
