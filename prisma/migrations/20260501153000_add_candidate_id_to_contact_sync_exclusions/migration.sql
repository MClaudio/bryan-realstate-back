ALTER TABLE "contact_sync_exclusions"
ADD COLUMN "candidate_id" TEXT;

CREATE UNIQUE INDEX "contact_sync_exclusions_candidate_id_key"
ON "contact_sync_exclusions"("candidate_id");
