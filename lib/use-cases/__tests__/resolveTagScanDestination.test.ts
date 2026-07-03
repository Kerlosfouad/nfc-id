import { describe, expect, it } from 'vitest';
import { resolveTagScanDestination } from '../resolveTagScanDestination';
import type { TagState } from '@/lib/domain/types';

describe('resolveTagScanDestination', () => {
  it.each<TagState>(['MANUFACTURED', 'SOLD'])(
    'routes %s tags to claim onboarding',
    (state) => {
      expect(resolveTagScanDestination({ publicId: 'ABC123', state })).toBe(
        '/signup?redirect=%2Fconnect-nfc%3FpublicId%3DABC123',
      );
    },
  );

  it.each<TagState>(['CLAIMED', 'ACTIVE'])(
    'routes %s tags to the public profile',
    (state) => {
      expect(resolveTagScanDestination({ publicId: 'ABC123', state })).toBe('/profile/ABC123');
    },
  );

  it('routes suspended tags to the suspended page', () => {
    expect(resolveTagScanDestination({ publicId: 'ABC123', state: 'SUSPENDED' })).toBe('/suspended');
  });
});
