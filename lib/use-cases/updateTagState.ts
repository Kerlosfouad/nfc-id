/**
 * Update Tag State use case.
 *
 * Validates that the requested state transition is legal, writes an immutable
 * TagAuditLog entry, updates the tag state, and — on SUSPENDED — invalidates
 * the Redis cache for the tag's publicId.
 *
 * Valid transitions:
 *   MANUFACTURED → SOLD
 *   SOLD         → CLAIMED
 *   CLAIMED      → ACTIVE
 *   *            → SUSPENDED  (from any state)
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import { db } from '../db';
import { del, tagCacheKey } from '../services/cacheService';
import type { TagState } from '../domain/types';

// ── Typed errors ──────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  constructor(message = 'Tag not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: TagState, to: TagState) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

// ── Valid transitions map ─────────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<TagState, TagState[]> = {
  MANUFACTURED: ['SOLD', 'SUSPENDED'],
  SOLD: ['CLAIMED', 'SUSPENDED'],
  CLAIMED: ['ACTIVE', 'SUSPENDED'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
};

// ── Use case ──────────────────────────────────────────────────────────────────

export interface UpdateTagStateInput {
  publicId: string;
  newState: TagState;
  adminId: string;
}

export interface UpdateTagStateResult {
  tagId: string;
  publicId: string;
  previousState: TagState;
  newState: TagState;
}

export async function updateTagState(
  input: UpdateTagStateInput,
): Promise<UpdateTagStateResult> {
  const { publicId, newState, adminId } = input;

  const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
    // 1. Fetch the tag
    const tag = await tx.tag.findUnique({ where: { publicId } });
    if (!tag) {
      throw new NotFoundError(`Tag with publicId "${publicId}" not found`);
    }

    const previousState = tag.state as TagState;

    // 2. Validate the transition (Req 9.1)
    const allowed = VALID_TRANSITIONS[previousState];
    if (!allowed.includes(newState)) {
      throw new InvalidTransitionError(previousState, newState);
    }

    // 3. Update tag state + write immutable audit log in one transaction (Req 9.2)
    const [updatedTag] = await Promise.all([
      tx.tag.update({
        where: { publicId },
        data: { state: newState },
      }),
      tx.tagAuditLog.create({
        data: {
          tagId: tag.id,
          previousState,
          newState,
          adminId,
          // createdAt defaults to now() in the schema (UTC)
        },
      }),
    ]);

    return {
      tagId: updatedTag.id,
      publicId: updatedTag.publicId,
      previousState,
      newState,
    };
  });

  // 4. On public availability changes: invalidate cache within 5 seconds (Req 9.3)
  if (newState === 'SUSPENDED' || result.previousState === 'SUSPENDED') {
    await del(tagCacheKey(publicId));
  }

  return result;
}
