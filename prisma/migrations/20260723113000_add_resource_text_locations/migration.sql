-- Add optional source-location metadata for AI resource citations.
ALTER TABLE "ActivityResourceText"
ADD COLUMN "pageStart" INTEGER,
ADD COLUMN "pageEnd" INTEGER,
ADD COLUMN "lineStart" INTEGER,
ADD COLUMN "lineEnd" INTEGER;
