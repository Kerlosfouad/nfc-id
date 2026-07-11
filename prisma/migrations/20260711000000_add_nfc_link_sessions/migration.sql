CREATE TABLE "NfcLinkSession" (
  "id" TEXT NOT NULL,
  "uid" TEXT,
  "publicId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NfcLinkSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NfcLinkSession_expiresAt_idx" ON "NfcLinkSession"("expiresAt");
