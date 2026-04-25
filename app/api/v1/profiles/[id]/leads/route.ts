import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { LeadFormInputSchema } from '@/lib/validators/schemas';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function getSourceIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

// ── POST /api/v1/profiles/:id/leads ──────────────────────────────────────────
// Public endpoint — no auth required (Req 5.1, 5.2, 5.4)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify profile exists
  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
      { status: 404 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  // Validate email (RFC 5322 via Zod) — Req 5.2
  const parsed = LeadFormInputSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.')] = issue.message;
    }
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          fields,
        },
      },
      { status: 400 }
    );
  }

  // Hash source IP — Req 5.4
  const rawIp = getSourceIp(request);
  const sourceIpHash = hashIp(rawIp);

  // Store submission — Req 5.1, 5.4
  const submission = await db.leadFormSubmission.create({
    data: {
      profileId: id,
      email: parsed.data.email,
      sourceIpHash,
      publicId: profile.publicId,
    },
  });

  return NextResponse.json({ data: submission, error: null }, { status: 200 });
}
