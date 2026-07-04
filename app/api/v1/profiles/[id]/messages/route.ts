import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { ProfileMessageInputSchema } from '@/lib/validators/schemas';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function getSourceIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

async function getOwnedProfile(profileId: string, userId: string | null) {
  if (!userId) return null;
  return db.profile.findFirst({
    where: { id: profileId, ownerId: userId },
    select: { id: true, publicId: true },
  });
}

async function ensureProfileMessagesTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProfileMessage" (
      "id" TEXT NOT NULL,
      "profileId" TEXT NOT NULL,
      "senderName" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "sourceIpHash" TEXT NOT NULL,
      "publicId" TEXT NOT NULL,
      "readAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProfileMessage_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProfileMessage_profileId_fkey'
      ) THEN
        ALTER TABLE "ProfileMessage"
        ADD CONSTRAINT "ProfileMessage_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProfileMessage_profileId_readAt_idx" ON "ProfileMessage"("profileId", "readAt")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProfileMessage_profileId_createdAt_idx" ON "ProfileMessage"("profileId", "createdAt")`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const profile = await getOwnedProfile(id, getUserId(request));

    if (!profile) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    await ensureProfileMessagesTable();

    const messages = await db.profileMessage.findMany({
      where: { profileId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        senderName: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: {
        messages,
        unreadCount: messages.filter(message => !message.readAt).length,
      },
      error: null,
    });
  } catch (error) {
    console.error('Load profile messages failed', error);
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Failed to load messages. Please try again after the database update finishes.' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = ProfileMessageInputSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;

    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid message', fields } },
      { status: 400 }
    );
  }

  try {
    const profile = await db.profile.findUnique({
      where: { id },
      select: { id: true, publicId: true, isSuspended: true, isActive: true },
    });

    if (!profile || profile.isSuspended || !profile.isActive) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
        { status: 404 }
      );
    }

    await ensureProfileMessagesTable();

    const message = await db.profileMessage.create({
      data: {
        profileId: id,
        publicId: profile.publicId,
        senderName: parsed.data.senderName,
        message: parsed.data.message,
        sourceIpHash: hashIp(getSourceIp(request)),
      },
      select: {
        id: true,
        senderName: true,
        message: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: message, error: null }, { status: 201 });
  } catch (error) {
    console.error('Create profile message failed', error);
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Failed to send message. Please try again after the database update finishes.' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const profile = await getOwnedProfile(id, getUserId(request));

    if (!profile) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    await ensureProfileMessagesTable();

    const result = await db.profileMessage.updateMany({
      where: { profileId: id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ data: { updated: result.count }, error: null });
  } catch (error) {
    console.error('Mark profile messages read failed', error);
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_ERROR', message: 'Failed to update messages. Please try again.' } },
      { status: 500 }
    );
  }
}
