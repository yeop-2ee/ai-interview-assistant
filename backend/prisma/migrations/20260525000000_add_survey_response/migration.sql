-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id"          SERIAL NOT NULL,
    "purpose"     TEXT,
    "naturalness" INTEGER,
    "feedback"    TEXT,
    "email"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);
