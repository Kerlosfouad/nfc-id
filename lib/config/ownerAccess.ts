export const DEFAULT_OWNER_EMAIL = 'kokomx10@gmail.com';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getOwnerEmails() {
  const configuredEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  return Array.from(new Set([DEFAULT_OWNER_EMAIL, ...configuredEmails]));
}

export function isOwnerEmail(email?: string | null) {
  if (!email) return false;
  return getOwnerEmails().includes(normalizeEmail(email));
}
