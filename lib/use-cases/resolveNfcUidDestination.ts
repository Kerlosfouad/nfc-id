import { db } from '@/lib/db';

export type NfcUidDestination =
  | { kind: 'profile'; href: string; publicId: string }
  | { kind: 'connect'; href: string }
  | { kind: 'suspended'; href: string };

export async function resolveNfcUidDestination(uid: string): Promise<NfcUidDestination> {
  const normalizedUid = uid.trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
  if (!normalizedUid) return { kind: 'connect', href: '/connect-nfc' };

  const tag = await db.nfcTag.findUnique({
    where: { uid: normalizedUid },
    select: {
      status: true,
      profile: { select: { publicId: true, isSuspended: true, isActive: true } },
    },
  });

  if (!tag) return { kind: 'connect', href: '/connect-nfc' };
  if (tag.status === 'SUSPENDED' || tag.profile?.isSuspended || tag.profile?.isActive === false) {
    return { kind: 'suspended', href: '/suspended' };
  }
  if (!tag.profile) return { kind: 'connect', href: '/connect-nfc' };

  return { kind: 'profile', href: `/profile/${tag.profile.publicId}`, publicId: tag.profile.publicId };
}

