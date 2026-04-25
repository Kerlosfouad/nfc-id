/**
 * Profile Page — /profile/[publicId]
 *
 * Next.js Server Component (SSR). Fetches the profile and its links, applies
 * scheduling filters, and renders the appropriate UI based on profile state.
 *
 * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8
 */

import { headers } from 'next/headers';
import { getProfileWithLinks, filterActiveLinks } from '@/lib/use-cases/getProfileWithLinks';
import SuspensionPage from '@/components/profile/SuspensionPage';
import PinGate from '@/components/profile/PinGate';
import ContentWarning from '@/components/profile/ContentWarning';
import ProfileView from '@/components/profile/ProfileView';
import { recordEvent } from '@/lib/services/analyticsService';

// ── Analytics ─────────────────────────────────────────────────────────────────

async function recordProfileView(profileId: string, publicId: string): Promise<void> {
  // Fire-and-forget: errors are intentionally swallowed so they never block rendering
  try {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') ?? '';
    const forwarded = headersList.get('x-forwarded-for') ?? '';
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
    const referer = headersList.get('referer') ?? '';

    // Determine referral source
    const referralSource = headersList.get('x-referral-source') === 'NFC'
      ? 'NFC'
      : referer
        ? 'SOCIAL'
        : 'DIRECT';

    // Geo from Vercel edge headers (no raw IP stored — Req 6.2)
    const geoCountry = headersList.get('x-vercel-ip-country') ?? null;
    const geoSubdivision = headersList.get('x-vercel-ip-country-region') ?? null;

    await recordEvent({
      profileId,
      publicId,
      eventType: 'VIEW',
      rawIp,
      userAgent,
      referralSource: referralSource as 'NFC' | 'DIRECT' | 'SOCIAL',
      geoCountry,
      geoSubdivision,
    });
  } catch {
    // Intentionally silent — analytics must never break the page render
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface ProfilePageProps {
  params: Promise<{ publicId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { publicId } = await params;

  const profile = await getProfileWithLinks(publicId);

  // Profile not found or suspended → show suspension notice
  if (!profile || profile.isSuspended) {
    return <SuspensionPage />;
  }

  // Password-protected → show PIN gate
  if (profile.passwordProtected) {
    return <PinGate publicId={publicId} />;
  }

  // Sensitive content → show content warning overlay
  if (profile.sensitiveContent) {
    return <ContentWarning profile={profile} />;
  }

  // Filter links by schedule
  const now = new Date();
  const activeLinks = filterActiveLinks(profile.links, now);

  // Fire-and-forget analytics (Req 3.8)
  void recordProfileView(profile.id, publicId);

  return <ProfileView profile={profile} links={activeLinks} />;
}

// Set cache headers for SSR (Req 3.1, 3.7)
export const revalidate = 60; // ISR: revalidate every 60 seconds
