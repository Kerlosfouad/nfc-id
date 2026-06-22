import type { TagState } from '@/lib/domain/types';

export interface ScannableTag {
  publicId: string;
  state: TagState;
}

export function resolveTagScanDestination(tag: ScannableTag): string {
  if (tag.state === 'MANUFACTURED' || tag.state === 'SOLD') {
    return `/claim/${tag.publicId}`;
  }

  if (tag.state === 'CLAIMED' || tag.state === 'ACTIVE') {
    return `/profile/${tag.publicId}`;
  }

  return '/suspended';
}
