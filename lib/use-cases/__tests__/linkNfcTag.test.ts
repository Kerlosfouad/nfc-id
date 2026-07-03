import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  nfcTag: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  profile: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}));

vi.mock('@/lib/services/cacheService', () => ({
  del: vi.fn(async () => undefined),
  tagCacheKey: (publicId: string) => `tag:${publicId}`,
}));

import {
  linkNfcTag,
  NfcTagLinkedToAnotherUserError,
  UserAlreadyHasNfcTagError,
} from '../linkNfcTag';

describe('linkNfcTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    mockTx.profile.findFirst.mockResolvedValue({
      id: 'profile-1',
      publicId: 'public-1',
      displayName: 'User',
    });
  });

  it('links an unlinked UID record to the authenticated user', async () => {
    mockTx.nfcTag.findUnique
      .mockResolvedValueOnce({
        id: 'tag-1',
        uid: '04:AA:BB',
        userId: null,
        profileId: null,
        profile: null,
        status: 'UNLINKED',
        linkedAt: null,
      })
      .mockResolvedValueOnce(null);
    mockTx.nfcTag.update.mockResolvedValue({
      id: 'tag-1',
      uid: '04:AA:BB',
      userId: 'user-1',
      profileId: 'profile-1',
      linkedAt: new Date('2026-07-03T00:00:00.000Z'),
    });

    const result = await linkNfcTag('user-1', '04:aa:bb');

    expect(result.status).toBe('linked');
    expect(mockTx.nfcTag.update).toHaveBeenCalledWith({
      where: { uid: '04:AA:BB' },
      data: expect.objectContaining({
        userId: 'user-1',
        profileId: 'profile-1',
        status: 'LINKED',
      }),
    });
  });

  it('prevents linking a card already linked to another user', async () => {
    mockTx.nfcTag.findUnique.mockResolvedValueOnce({
      id: 'tag-1',
      uid: '04:AA:BB',
      userId: 'other-user',
      profileId: 'profile-2',
      profile: null,
      status: 'LINKED',
      linkedAt: new Date(),
    });

    await expect(linkNfcTag('user-1', '04:AA:BB')).rejects.toThrow(NfcTagLinkedToAnotherUserError);
  });

  it('prevents one account from linking multiple NFC cards', async () => {
    mockTx.nfcTag.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'tag-existing',
        uid: '04:EXISTING',
        userId: 'user-1',
        profileId: 'profile-1',
        status: 'LINKED',
        linkedAt: new Date(),
      });

    await expect(linkNfcTag('user-1', '04:NEW')).rejects.toThrow(UserAlreadyHasNfcTagError);
  });
});
