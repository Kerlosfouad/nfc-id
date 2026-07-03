ALTER TYPE "NfcTagStatus" ADD VALUE IF NOT EXISTS 'UNLINKED';
ALTER TYPE "NfcTagStatus" ADD VALUE IF NOT EXISTS 'LINKED';

ALTER TABLE "NfcTag" DROP CONSTRAINT IF EXISTS "NfcTag_userId_fkey";
DROP INDEX IF EXISTS "NfcTag_userId_idx";

UPDATE "NfcTag"
SET "status" = 'LINKED'
WHERE "status" = 'ACTIVE';

ALTER TABLE "NfcTag" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "NfcTag" ALTER COLUMN "linkedAt" DROP NOT NULL;
ALTER TABLE "NfcTag" ALTER COLUMN "status" SET DEFAULT 'UNLINKED';

CREATE UNIQUE INDEX "NfcTag_userId_key" ON "NfcTag"("userId");

ALTER TABLE "NfcTag"
ADD CONSTRAINT "NfcTag_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_ownerId_fkey";
ALTER TABLE "Tag"
ADD CONSTRAINT "Tag_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_ownerId_fkey";
ALTER TABLE "Profile"
ADD CONSTRAINT "Profile_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "release_nfc_tag_when_user_unlinked"()
RETURNS trigger AS $$
BEGIN
  IF NEW."userId" IS NULL THEN
    NEW."profileId" := NULL;
    NEW."status" := 'UNLINKED';
    NEW."linkedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "NfcTag_release_on_user_unlink" ON "NfcTag";
CREATE TRIGGER "NfcTag_release_on_user_unlink"
BEFORE UPDATE OF "userId" ON "NfcTag"
FOR EACH ROW
EXECUTE FUNCTION "release_nfc_tag_when_user_unlinked"();
