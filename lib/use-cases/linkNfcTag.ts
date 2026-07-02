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
  constructor(message = 'This medal is already linked to another account') {
    super(message);
    this.name = 'NfcTagLinkedToAnotherUserError';
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
    linkedAt: Date;
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

    if (existingTag && existingTag.userId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
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
        existingTag.profileId === profile.id
          ? existingTag
          : await tx.nfcTag.update({
              where: { uid: normalizedUid },
              data: { profileId: profile.id, status: 'ACTIVE' },
            });

      return {
        status: 'already-linked' as const,
        tag: {
          id: tag.id,
          uid: tag.uid,
          userId: tag.userId,
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
        status: 'ACTIVE',
      },
    });

    return {
      status: 'linked' as const,
      tag: {
        id: tag.id,
        uid: tag.uid,
        userId: tag.userId,
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
    if (existingNfcTag && existingNfcTag.userId !== userId) {
      throw new NfcTagLinkedToAnotherUserError();
    }

    const nfcTag = await tx.nfcTag.upsert({
      where: { uid: nfcTagUid },
      create: {
        uid: nfcTagUid,
        userId,
        profileId: profile.id,
        status: 'ACTIVE',
      },
      update: {
        userId,
        profileId: profile.id,
        status: 'ACTIVE',
      },
    });

    return {
      status: existingProfile ? ('already-linked' as const) : ('linked' as const),
      tag: {
        id: nfcTag.id,
        uid: nfcTag.uid,
        userId: nfcTag.userId,
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
