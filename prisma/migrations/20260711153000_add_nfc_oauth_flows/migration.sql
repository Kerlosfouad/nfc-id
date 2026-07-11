CREATE TABLE "NfcOAuthFlow" (
  "id" TEXT NOT NULL,
  "providerState" TEXT NOT NULL,
  "nfcSessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NfcOAuthFlow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NfcOAuthFlow_providerState_key" ON "NfcOAuthFlow"("providerState");
CREATE INDEX "NfcOAuthFlow_expiresAt_idx" ON "NfcOAuthFlow"("expiresAt");
