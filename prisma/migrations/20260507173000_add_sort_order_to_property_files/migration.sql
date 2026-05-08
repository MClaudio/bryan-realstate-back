ALTER TABLE "property_files"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "property_files" pf
SET "sort_order" = ordered.row_num - 1
FROM (
  SELECT
    "property_id",
    "file_id",
    ROW_NUMBER() OVER (
      PARTITION BY "property_id", "file_type"
      ORDER BY "created_at" ASC, "file_id" ASC
    ) AS row_num
  FROM "property_files"
) AS ordered
WHERE pf."property_id" = ordered."property_id"
  AND pf."file_id" = ordered."file_id";