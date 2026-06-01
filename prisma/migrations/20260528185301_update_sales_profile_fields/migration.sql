/*
  Warnings:

  - You are about to drop the column `email` on the `SalesProfile` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `SalesProfile` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `SalesProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SalesProfile" DROP COLUMN "email",
DROP COLUMN "phone",
DROP COLUMN "position",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "photo" TEXT;
