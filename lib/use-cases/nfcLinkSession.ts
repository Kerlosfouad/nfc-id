import { db } from '@/lib/db';

const LINK_SESSION_TTL_MS = 15 * 60 * 1000;

function normalizeUid(uid: string) {
  return uid.trim().toUpperCase().replace(/[^A-Z0-9:_-]/g, '');
}

function normalizePublicId(publicId: string) {
  return publicId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function createNfcLinkSession(input: { uid?: string; publicId?: string }) {
  const uid = input.uid ? normalizeUid(input.uid) : null;
  const publicId = input.publicId ? normalizePublicId(input.publicId) : null;
  if (!uid && !publicId) throw new Error('NFC link session requires a UID or public ID');

  const session = await db.nfcLinkSession.create({
    data: {
      uid,
      publicId,
      expiresAt: new Date(Date.now() + LINK_SESSION_TTL_MS),
    },
    select: { id: true },
  });

  return session.id;
}

export async function resolveNfcLinkSession(id: string) {
  const sessionId = id.trim();
  if (!sessionId) return null;

  const session = await db.nfcLinkSession.findUnique({
    where: { id: sessionId },
    select: { uid: true, publicId: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await db.nfcLinkSession.delete({ where: { id: sessionId } }).catch(() => undefined);
    }
    return null;
  }

  return {
    uid: session.uid ?? undefined,
    publicId: session.publicId ?? undefined,
  };
}

export async function createNfcOAuthFlow(input: { providerState: string; nfcSessionId: string }) {
  const providerState = input.providerState.trim();
  const nfcSessionId = input.nfcSessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!providerState || !nfcSessionId) return;

  await db.nfcOAuthFlow.upsert({
    where: { providerState },
    create: {
      providerState,
      nfcSessionId,
      expiresAt: new Date(Date.now() + LINK_SESSION_TTL_MS),
    },
    update: {
      nfcSessionId,
      expiresAt: new Date(Date.now() + LINK_SESSION_TTL_MS),
    },
  });
}

export async function resolveNfcOAuthFlow(providerState: string) {
  const state = providerState.trim();
  if (!state) return null;

  const flow = await db.nfcOAuthFlow.findUnique({
    where: { providerState: state },
    select: { nfcSessionId: true, expiresAt: true },
  });

  if (!flow || flow.expiresAt.getTime() <= Date.now()) {
    if (flow) {
      await db.nfcOAuthFlow.delete({ where: { providerState: state } }).catch(() => undefined);
    }
    return null;
  }

  return flow.nfcSessionId;
}
