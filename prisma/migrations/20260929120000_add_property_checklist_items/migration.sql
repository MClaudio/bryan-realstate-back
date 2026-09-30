-- CreateTable
CREATE TABLE "property_checklist_items" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "side" "ProcessType" NOT NULL,
    "item_key" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checked_at" TIMESTAMP(3),
    "checked_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_checklist_items_property_id_side_item_key_key" ON "property_checklist_items"("property_id", "side", "item_key");

-- AddForeignKey
ALTER TABLE "property_checklist_items" ADD CONSTRAINT "property_checklist_items_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_checklist_items" ADD CONSTRAINT "property_checklist_items_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
