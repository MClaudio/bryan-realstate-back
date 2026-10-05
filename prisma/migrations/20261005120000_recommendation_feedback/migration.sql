-- Calificaciones (like / dislike) del equipo a las recomendaciones de la IA.
-- Histórico de solo agregar con eliminado lógico (deleted_at).
CREATE TYPE "FeedbackRating" AS ENUM ('like', 'dislike');
CREATE TYPE "FeedbackReason" AS ENUM ('presupuesto', 'ubicacion', 'tipo', 'tamano', 'no_busca', 'otro');

CREATE TABLE "recommendation_feedback" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "rating" "FeedbackRating" NOT NULL,
    "reason" "FeedbackReason",
    "comment" TEXT,
    "interest_level" "InterestLevel",
    "ai_reason" TEXT,
    "client_interest" TEXT,
    "property_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recommendation_feedback_property_id_client_id_deleted_at_idx" ON "recommendation_feedback"("property_id", "client_id", "deleted_at");
CREATE INDEX "recommendation_feedback_rating_deleted_at_created_at_idx" ON "recommendation_feedback"("rating", "deleted_at", "created_at");

ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
