-- CreateEnum
CREATE TYPE "ActivityResourceKind" AS ENUM ('READING', 'SLIDES', 'WORKSHEET', 'REFERENCE', 'STARTER_FILE', 'DATASET', 'EXAMPLE', 'OTHER');

-- AlterTable
ALTER TABLE "ActivityResource" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ActivityResourceKind" NOT NULL DEFAULT 'OTHER';
