CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maxPoints" DECIMAL(8,2) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricAssessment" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricCriterionScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricCriterionScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rubric_activityId_key" ON "Rubric"("activityId");
CREATE UNIQUE INDEX "RubricCriterion_rubricId_position_key" ON "RubricCriterion"("rubricId", "position");
CREATE UNIQUE INDEX "RubricAssessment_gradeId_key" ON "RubricAssessment"("gradeId");
CREATE UNIQUE INDEX "RubricAssessment_rubricId_submissionId_key" ON "RubricAssessment"("rubricId", "submissionId");
CREATE INDEX "RubricAssessment_studentId_idx" ON "RubricAssessment"("studentId");
CREATE INDEX "RubricAssessment_gradedById_idx" ON "RubricAssessment"("gradedById");
CREATE UNIQUE INDEX "RubricCriterionScore_assessmentId_criterionId_key" ON "RubricCriterionScore"("assessmentId", "criterionId");

ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricAssessment" ADD CONSTRAINT "RubricAssessment_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricAssessment" ADD CONSTRAINT "RubricAssessment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricAssessment" ADD CONSTRAINT "RubricAssessment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricCriterionScore" ADD CONSTRAINT "RubricCriterionScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RubricAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricCriterionScore" ADD CONSTRAINT "RubricCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
