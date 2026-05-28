-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionToken" TEXT;
ALTER TABLE "User" ADD COLUMN "sessionExpiresAt" TIMESTAMP(3);
