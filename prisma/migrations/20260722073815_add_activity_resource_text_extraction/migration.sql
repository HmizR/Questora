-- CreateEnum
CREATE TYPE "ActivityResourceTextStatus" AS ENUM ('NOT_EXTRACTED', 'READY', 'UNSUPPORTED', 'FAILED');

-- AlterTable
ALTER TABLE "ActivityResource" ADD COLUMN     "textError" TEXT,
ADD COLUMN     "textExtractedAt" TIMESTAMP(3),
ADD COLUMN     "textStatus" "ActivityResourceTextStatus" NOT NULL DEFAULT 'NOT_EXTRACTED';

-- CreateTable
CREATE TABLE "ActivityResourceText" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityResourceText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityResourceText_resourceId_chunkIndex_key" ON "ActivityResourceText"("resourceId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ActivityResource_textStatus_idx" ON "ActivityResource"("textStatus");

-- AddForeignKey
ALTER TABLE "ActivityResourceText" ADD CONSTRAINT "ActivityResourceText_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "ActivityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
