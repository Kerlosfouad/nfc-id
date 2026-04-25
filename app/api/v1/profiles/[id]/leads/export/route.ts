import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/** Escape a CSV field: wrap in quotes and double any internal quotes. */
function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

// ── GET /api/v1/profiles/:id/leads/export ─────────────────────────────────────
// Owner-only: stream CSV of lead submissions (Req 5.3)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Verify profile exists and caller is the owner
  const profile = await db.profile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
      { status: 404 }
    );
  }
  if (profile.ownerId !== userId) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    );
  }

  // Fetch all lead submissions for this profile
  const submissions = await db.leadFormSubmission.findMany({
    where: { profileId: id },
    orderBy: { submittedAt: 'asc' },
  });

  // Build CSV
  const header = 'id,email,submittedAt,publicId\n';
  const rows = submissions
    .map(
      (s: { id: string; email: string; submittedAt: Date; publicId: string }) =>
        [
          csvEscape(s.id),
          csvEscape(s.email),
          csvEscape(s.submittedAt.toISOString()),
          csvEscape(s.publicId),
        ].join(',')
    )
    .join('\n');

  const csv = header + rows;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${id}.csv"`,
    },
  });
}
