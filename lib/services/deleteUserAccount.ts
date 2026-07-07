import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { del, profileCacheKey, tagCacheKey } from '@/lib/services/cacheService';

export async function deleteUserAccount(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Auth service is not configured.');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profiles: { select: { id: true, publicId: true } },
      tags: { select: { publicId: true } },
    },
  });

  const cachePublicIds = new Set<string>();
  for (const profile of user?.profiles ?? []) cachePublicIds.add(profile.publicId);
  for (const tag of user?.tags ?? []) cachePublicIds.add(tag.publicId);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError && !/not\s*found|does\s*not\s*exist/i.test(authDeleteError.message)) {
    throw new Error(authDeleteError.message);
  }

  await db.$transaction(async (tx) => {
    await tx.nfcTag.updateMany({
      where: { userId },
      data: {
        userId: null,
        profileId: null,
        status: 'UNLINKED',
        linkedAt: null,
      },
    });

    await tx.tag.updateMany({
      where: { ownerId: userId },
      data: { ownerId: null, state: 'SOLD' },
    });

    await tx.user.deleteMany({ where: { id: userId } });
  });

  for (const publicId of cachePublicIds) {
    void del(profileCacheKey(publicId));
    void del(tagCacheKey(publicId));
  }

  return {
    id: userId,
    email: user?.email ?? null,
    deletedFromDatabase: Boolean(user),
  };
}
