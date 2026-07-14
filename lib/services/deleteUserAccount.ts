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
      nfcTags: { select: { uid: true } },
    },
  });

  const cachePublicIds = new Set<string>();
  for (const profile of user?.profiles ?? []) cachePublicIds.add(profile.publicId);
  for (const tag of user?.tags ?? []) cachePublicIds.add(tag.publicId);
  const profileIds = (user?.profiles ?? []).map((profile) => profile.id);
  const email = user?.email?.toLowerCase() ?? null;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await db.$transaction(async (tx) => {
    try {
      await tx.$executeRaw`DELETE FROM push_subscriptions WHERE user_id = ${userId}`;
    } catch (error) {
      if (!/does not exist|undefined_table/i.test(error instanceof Error ? error.message : String(error))) throw error;
    }

    if (email) {
      try {
        await tx.$executeRaw`DELETE FROM shop_orders WHERE lower(email) = ${email}`;
      } catch (error) {
        if (!/does not exist|undefined_table/i.test(error instanceof Error ? error.message : String(error))) throw error;
      }
    }

    await tx.nfcTag.deleteMany({
      where: {
        OR: [
          { userId },
          ...(profileIds.length > 0 ? [{ profileId: { in: profileIds } }] : []),
        ],
      },
    });

    await tx.tag.updateMany({
      where: { ownerId: userId },
      data: { ownerId: null, state: 'SOLD' },
    });

    await tx.tagAuditLog.deleteMany({ where: { adminId: userId } });
    await tx.user.deleteMany({ where: { id: userId } });
  });

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError && !/not\s*found|does\s*not\s*exist/i.test(authDeleteError.message)) {
    throw new Error(authDeleteError.message);
  }

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
