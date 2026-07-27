-- Add return-for-revision metadata to active submissions and preserved revisions.
ALTER TABLE "Submission"
ADD COLUMN "returnFeedback" TEXT,
ADD COLUMN "returnedAt" TIMESTAMP(3);

ALTER TABLE "SubmissionRevision"
ADD COLUMN "returnFeedback" TEXT,
ADD COLUMN "returnedAt" TIMESTAMP(3);
