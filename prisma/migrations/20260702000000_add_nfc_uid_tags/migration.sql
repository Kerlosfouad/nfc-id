CREATE TYPE "NfcTagStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "NfcTag" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "status" "NfcTagStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NfcTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NfcTag_uid_key" ON "NfcTag"("uid");
CREATE INDEX "NfcTag_userId_idx" ON "NfcTag"("userId");
CREATE INDEX "NfcTag_profileId_idx" ON "NfcTag"("profileId");

ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
