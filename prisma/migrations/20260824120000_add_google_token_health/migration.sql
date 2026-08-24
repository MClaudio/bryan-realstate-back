-- AlterTable
ALTER TABLE "google_auth_tokens"
ADD COLUMN "needs_reauth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_refresh_at" TIMESTAMP(3),
ADD COLUMN "last_error" TEXT;
