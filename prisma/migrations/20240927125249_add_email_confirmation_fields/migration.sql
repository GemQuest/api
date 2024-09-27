-- AlterTable
ALTER TABLE "User" ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmationTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "emailConfirmed" BOOLEAN NOT NULL DEFAULT false;
