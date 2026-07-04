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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getOwnedProfile(id, getUserId(request));

  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    );
  }

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
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getOwnedProfile(id, getUserId(request));

  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    );
  }

  const result = await db.profileMessage.updateMany({
    where: { profileId: id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ data: { updated: result.count }, error: null });
}
