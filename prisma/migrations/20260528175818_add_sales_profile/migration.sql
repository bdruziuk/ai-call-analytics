-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "salesProfileId" TEXT;

-- CreateTable
CREATE TABLE "SalesProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesProfile" ADD CONSTRAINT "SalesProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_salesProfileId_fkey" FOREIGN KEY ("salesProfileId") REFERENCES "SalesProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
