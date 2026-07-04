CREATE TABLE "ProfileMessage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceIpHash" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileMessage_profileId_readAt_idx" ON "ProfileMessage"("profileId", "readAt");
CREATE INDEX "ProfileMessage_profileId_createdAt_idx" ON "ProfileMessage"("profileId", "createdAt");

ALTER TABLE "ProfileMessage" ADD CONSTRAINT "ProfileMessage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
