-- Preserve previous assignment/project submission versions before editable resubmissions overwrite the active row.
CREATE TABLE "SubmissionRevision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "textContent" TEXT,
    "fileUrl" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionRevision_submissionId_revisionNo_key" ON "SubmissionRevision"("submissionId", "revisionNo");
CREATE INDEX "SubmissionRevision_activityId_studentId_idx" ON "SubmissionRevision"("activityId", "studentId");

ALTER TABLE "SubmissionRevision" ADD CONSTRAINT "SubmissionRevision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionRevision" ADD CONSTRAINT "SubmissionRevision_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionRevision" ADD CONSTRAINT "SubmissionRevision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
