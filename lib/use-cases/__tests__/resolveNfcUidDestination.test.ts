import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    nfcTag: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

import { resolveNfcUidDestination } from '../resolveNfcUidDestination';

describe('resolveNfcUidDestination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes unknown UIDs to registration', async () => {
    mockDb.nfcTag.findUnique.mockResolvedValue(null);

    await expect(resolveNfcUidDestination('04:AA:BB')).resolves.toEqual({
      kind: 'register',
      href: '/signup?redirect=%2Fconnect-nfc%3Fuid%3D04%253AAA%253ABB',
    });
  });

  it('routes unlinked saved UIDs to registration', async () => {
    mockDb.nfcTag.findUnique.mockResolvedValue({
      status: 'UNLINKED',
      userId: null,
      profile: null,
    });

    await expect(resolveNfcUidDestination('04:AA:BB')).resolves.toEqual({
      kind: 'register',
      href: '/signup?redirect=%2Fconnect-nfc%3Fuid%3D04%253AAA%253ABB',
    });
  });

  it('routes linked UIDs to the owner profile', async () => {
    mockDb.nfcTag.findUnique.mockResolvedValue({
      status: 'LINKED',
      userId: 'user-1',
      profile: { publicId: 'owner-profile', isSuspended: false, isActive: true },
    });

    await expect(resolveNfcUidDestination('04:AA:BB')).resolves.toEqual({
      kind: 'profile',
      href: '/profile/owner-profile',
      publicId: 'owner-profile',
    });
  });
});
