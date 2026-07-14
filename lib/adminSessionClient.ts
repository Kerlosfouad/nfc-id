"use client";

import { createClient } from "@/lib/supabase/client";

type AdminSessionHeaders = {
  accessToken: string;
  userId: string;
  expiresAt: number;
  headers: {
    Authorization: string;
    "x-user-id": string;
  };
};

let cachedSessionHeaders: AdminSessionHeaders | null = null;
let sessionHeadersPromise: Promise<AdminSessionHeaders | null> | null = null;

export async function getAdminSessionHeaders() {
  if (cachedSessionHeaders && cachedSessionHeaders.expiresAt > Date.now() + 60_000) return cachedSessionHeaders;
  cachedSessionHeaders = null;
  if (!sessionHeadersPromise) {
    sessionHeadersPromise = createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) return null;
        cachedSessionHeaders = {
          accessToken: session.access_token,
          userId: session.user.id,
          expiresAt: (session.expires_at ?? 0) * 1000,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-user-id": session.user.id,
          },
        };
        return cachedSessionHeaders;
      })
      .finally(() => {
        sessionHeadersPromise = null;
      });
  }

  return sessionHeadersPromise;
}

export function clearAdminSessionHeaders() {
  cachedSessionHeaders = null;
  sessionHeadersPromise = null;
}
