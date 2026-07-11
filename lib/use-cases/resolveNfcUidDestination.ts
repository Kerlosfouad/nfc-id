import { db } from '@/lib/db';
import { createNfcLinkSession } from '@/lib/use-cases/nfcLinkSession';

export type NfcUidDestination =
  | { kind: 'profile'; href: string; publicId: string }
  | { kind: 'register'; href: string }
  | { kind: 'suspended'; href: string };

export async function resolveNfcUidDestination(uid: string): Promise<NfcUidDestination> {
  const normalizedUid = uid.trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
  if (!normalizedUid) return { kind: 'register', href: '/signup' };
  const sessionId = await createNfcLinkSession({ uid: normalizedUid });
  const registerHref = `/signup?nfcSession=${encodeURIComponent(sessionId)}`;

  const tag = await db.nfcTag.findUnique({
    where: { uid: normalizedUid },
    select: {
      status: true,
      userId: true,
      profile: { select: { publicId: true, isSuspended: true, isActive: true } },
    },
  });

  if (!tag || !tag.userId || tag.status === 'UNLINKED') {
    return { kind: 'register', href: registerHref };
  }
  if (tag.status === 'SUSPENDED' || tag.profile?.isSuspended || tag.profile?.isActive === false) {
    return { kind: 'suspended', href: '/suspended' };
  }
  if (!tag.profile) return { kind: 'register', href: registerHref };

  return { kind: 'profile', href: `/profile/${tag.profile.publicId}`, publicId: tag.profile.publicId };
}
