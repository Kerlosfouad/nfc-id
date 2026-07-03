import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { del, tagCacheKey } from '@/lib/services/cacheService';

export class InvalidNfcUidError extends Error {
  readonly statusCode = 400;
  constructor(message = 'NFC UID is required') {
    super(message);
    this.name = 'InvalidNfcUidError';
  }
}

export class NfcTagLinkedToAnotherUserError extends Error {
  readonly statusCode = 409;
  constructor(message = 'This NFC card is already linked to another account') {
    super(message);
    this.name = 'NfcTagLinkedToAnotherUserError';
  }
}

export class UserAlreadyHasNfcTagError extends Error {
  readonly statusCode = 409;
  constructor(message = 'This account already has a linked NFC card') {
    super(message);
    this.name = 'UserAlreadyHasNfcTagError';
  }
}

export type LinkNfcTagStatus = 'linked' | 'already-linked';

export interface LinkNfcTagResult {
  status: LinkNfcTagStatus;
  tag: {
    id: string;
    uid: string;
    userId: string;
    profileId: string | null;
    linkedAt: Date | null;
  };
  profile: {
    id: string;
    publicId: string;
    displayName: string;
  };
}

function normalizeUid(uid: string) {
  return uid.trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
}

function normalizePublicId(publicId: string) {
  return publicId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

function newPublicId() {
  return `nfc-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function defaultProfile(ownerId: string, displayName = 'My Profile') {
  return {
    publicId: newPublicId(),
    ownerId,
    displayName,
    theme: {
      style: 'minimal' as const,
      primaryColor: '#03A9F4',
      fontFamily: 'Inter',
    },
  };
}

export async function linkNfcTag(userId: string, uid: string): Promise<LinkNfcTagResult> {
  const normalizedUid = normalizeUid(uid);
  if (!normalizedUid) throw new InvalidNfcUidError();

  return db.$transaction(async (tx) => {
    const existingTag = await tx.nfcTag.findUnique({
      where: { uid: normalizedUid },
      include: { profile: true },
    });

    if (existingTag?.userId && existingTag.userId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
    }

    const usersLinkedTag = await tx.nfcTag.findUnique({ where: { userId } });
    if (usersLinkedTag && usersLinkedTag.uid !== normalizedUid) {
      throw new UserAlreadyHasNfcTagError();
    }

    const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
    const profile =
      existingTag?.profile ??
      (await tx.profile.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, publicId: true, displayName: true },
      })) ??
      (await tx.profile.create({
        data: defaultProfile(userId, user?.email?.split('@')[0] || 'My Profile'),
        select: { id: true, publicId: true, displayName: true },
      }));

    if (existingTag) {
      const tag =
        existingTag.userId === userId &&
        existingTag.profileId === profile.id &&
        existingTag.status === 'LINKED'
          ? existingTag
          : await tx.nfcTag.update({
              where: { uid: normalizedUid },
              data: {
                userId,
                profileId: profile.id,
                status: 'LINKED',
                linkedAt: existingTag.linkedAt ?? new Date(),
              },
            });

      return {
        status: existingTag.userId === userId ? ('already-linked' as const) : ('linked' as const),
        tag: {
          id: tag.id,
          uid: tag.uid,
          userId: tag.userId ?? userId,
          profileId: tag.profileId,
          linkedAt: tag.linkedAt,
        },
        profile,
      };
    }

    const tag = await tx.nfcTag.create({
      data: {
        uid: normalizedUid,
        userId,
        profileId: profile.id,
        status: 'LINKED',
        linkedAt: new Date(),
      },
    });

    return {
      status: 'linked' as const,
      tag: {
        id: tag.id,
        uid: tag.uid,
        userId: tag.userId ?? userId,
        profileId: tag.profileId,
        linkedAt: tag.linkedAt,
      },
      profile,
    };
  });
}

export async function linkPublicTag(
  userId: string,
  publicId: string,
  uid?: string,
): Promise<LinkNfcTagResult> {
  const normalizedPublicId = normalizePublicId(publicId);
  const normalizedUid = uid ? normalizeUid(uid) : '';
  if (!normalizedPublicId) throw new InvalidNfcUidError('A valid NFC tag link is required');

  const result = await db.$transaction(async (tx) => {
    const publicTag = await tx.tag.findUnique({
      where: { publicId: normalizedPublicId },
    });

    if (!publicTag) throw new InvalidNfcUidError('This card link was not found');
    if (publicTag.ownerId && publicTag.ownerId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
    }

    const existingProfile = await tx.profile.findUnique({
      where: { publicId: normalizedPublicId },
      select: { id: true, publicId: true, displayName: true, ownerId: true },
    });

    if (existingProfile && existingProfile.ownerId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
    }

    const profile =
      existingProfile ??
      (await tx.profile.create({
        data: defaultProfile(userId, normalizedPublicId),
        select: { id: true, publicId: true, displayName: true, ownerId: true },
      }));

    await tx.tag.update({
      where: { publicId: normalizedPublicId },
      data: {
        ownerId: userId,
        state: 'ACTIVE',
      },
    });

    const nfcTagUid = normalizedUid || `PUBLIC:${normalizedPublicId}`;
    const existingNfcTag = await tx.nfcTag.findUnique({ where: { uid: nfcTagUid } });
    if (existingNfcTag?.userId && existingNfcTag.userId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
    }

    const usersLinkedTag = await tx.nfcTag.findUnique({ where: { userId } });
    if (usersLinkedTag && usersLinkedTag.uid !== nfcTagUid) {
      throw new UserAlreadyHasNfcTagError();
    }

    const nfcTag = await tx.nfcTag.upsert({
      where: { uid: nfcTagUid },
      create: {
        uid: nfcTagUid,
        userId,
        profileId: profile.id,
        status: 'LINKED',
        linkedAt: new Date(),
      },
      update: {
        userId,
        profileId: profile.id,
        status: 'LINKED',
        linkedAt: existingNfcTag?.linkedAt ?? new Date(),
      },
    });

    return {
      status: existingProfile ? ('already-linked' as const) : ('linked' as const),
      tag: {
        id: nfcTag.id,
        uid: nfcTag.uid,
        userId: nfcTag.userId ?? userId,
        profileId: nfcTag.profileId,
        linkedAt: nfcTag.linkedAt,
      },
      profile: {
        id: profile.id,
        publicId: profile.publicId,
        displayName: profile.displayName,
      },
    };
  });

  await del(tagCacheKey(normalizedPublicId));
  return result;
}
