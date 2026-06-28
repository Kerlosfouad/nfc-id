import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/adminCheck';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const customers = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      profiles: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          publicId: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          isVerified: true,
          primeDesignUntil: true,
          verifiedUntil: true,
          isSuspended: true,
          isActive: true,
          links: {
            where: {
              OR: [
                { title: { contains: 'phone', mode: 'insensitive' } },
                { title: { contains: 'whatsapp', mode: 'insensitive' } },
                { type: 'WHATSAPP' },
              ],
            },
            select: { title: true, url: true },
            take: 3,
          },
        },
      },
      _count: {
        select: {
          tags: true,
          profiles: true,
        },
      },
    },
  });

  return NextResponse.json({ data: customers, error: null });
}
