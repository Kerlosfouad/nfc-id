/**
 * Batch Tag Generation use case.
 *
 * Generates a batch of unique NanoID Public_IDs, deduplicates against existing
 * IDs in the database, bulk-inserts them with MANUFACTURED state, and returns
 * the IDs as a UTF-8 CSV string.
 *
 * Requirements: 8.1, 8.2, 8.3
 */

import { nanoid } from 'nanoid';
import { db } from '../db';

export interface BatchGenerateResult {
  ids: string[];
  csv: string;
}

/**
 * Convert an array of Public_IDs to a UTF-8 CSV string with a header row.
 * Format: one ID per line, header row "publicId".
 */
function toCSV(ids: string[]): string {
  return ['publicId', ...ids].join('\n');
}

/**
 * Generate a batch of unique NanoID Public_IDs and persist them.
 *
 * @param quantity - Number of IDs to generate (1–10,000)
 * @returns Object containing the generated IDs array and CSV string
 */
export async function batchGenerateTags(quantity: number): Promise<BatchGenerateResult> {
  // Generate initial set of IDs (9-character NanoID, URL-safe alphabet)
  let ids = Array.from({ length: quantity }, () => nanoid(9));

  // Deduplicate within the batch itself (handle internal collisions)
  let uniqueIds = Array.from(new Set(ids));
  while (uniqueIds.length < quantity) {
    const needed = quantity - uniqueIds.length;
    const extra = Array.from({ length: needed }, () => nanoid(9));
    uniqueIds = Array.from(new Set([...uniqueIds, ...extra]));
  }
  ids = uniqueIds.slice(0, quantity);

  // Deduplicate against existing IDs in the database (Req 8.2)
  let finalIds = [...ids];
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await db.tag.findMany({
      where: { publicId: { in: finalIds } },
      select: { publicId: true },
    });

    if (existing.length === 0) break;

    const existingSet = new Set(existing.map((t: { publicId: string }) => t.publicId));
    const collisions = finalIds.filter((id) => existingSet.has(id));

    // Regenerate colliding IDs
    const regenerated: string[] = [];
    for (let i = 0; i < collisions.length; i++) {
      regenerated.push(nanoid(9));
    }

    // Replace collisions with regenerated IDs, ensuring no new internal duplicates
    const nonColliding = finalIds.filter((id) => !existingSet.has(id));
    const combined = Array.from(new Set([...nonColliding, ...regenerated]));

    // If we still don't have enough unique IDs, generate more
    while (combined.length < quantity) {
      combined.push(nanoid(9));
    }

    finalIds = Array.from(new Set(combined)).slice(0, quantity);
    attempts++;
  }

  // Bulk-insert all IDs with MANUFACTURED state (Req 8.1)
  await db.tag.createMany({
    data: finalIds.map((publicId) => ({
      publicId,
      state: 'MANUFACTURED' as const,
    })),
  });

  const csv = toCSV(finalIds);

  return { ids: finalIds, csv };
}
