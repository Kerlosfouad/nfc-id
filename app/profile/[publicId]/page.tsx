/**
 * Profile Page - /profile/[publicId]
 *
 * Server-rendered profile shell. Analytics is recorded on the client after the
 * first paint so NFC scans never wait on tracking writes.
 */

import { getProfileWithLinks, filterActiveLinks } from '@/lib/use-cases/getProfileWithLinks';
import SuspensionPage from '@/components/profile/SuspensionPage';
import PinGate from '@/components/profile/PinGate';
import ContentWarning from '@/components/profile/ContentWarning';
import ProfileView from '@/components/profile/ProfileView';
import type { ProfileTheme } from '@/lib/domain/types';
import { preload } from 'react-dom';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

interface ProfilePageProps {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { publicId } = await params;
  const query = await searchParams;

  const profile = await getProfileWithLinks(publicId);

  if (profile && query.preview === 'true') {
    if (typeof query.style === 'string') profile.theme.style = query.style as ProfileTheme['style'];
    if (typeof query.linksLayout === 'string') profile.theme.linksLayout = query.linksLayout as ProfileTheme['linksLayout'];
    if (typeof query.profileLayout === 'string') profile.theme.profileLayout = query.profileLayout as ProfileTheme['profileLayout'];
  }

  if (!profile) {
    const tag = await db.tag.findUnique({
      where: { publicId },
      select: { publicId: true },
    });

    if (tag) redirect(`/${publicId}`);
    return <SuspensionPage />;
  }

  if (profile.isSuspended) {
    return <SuspensionPage />;
  }

  if (profile.avatarUrl) {
    preload(profile.avatarUrl, { as: 'image' });
  }

  if (profile.theme.coverUrl) {
    preload(profile.theme.coverUrl, { as: 'image' });
  }

  const firstThumbnail = profile.links.find((link) => link.thumbnailUrl)?.thumbnailUrl;
  if (firstThumbnail) {
    preload(firstThumbnail, { as: 'image' });
  }

  if (profile.passwordProtected) {
    return <PinGate publicId={publicId} />;
  }

  if (profile.sensitiveContent) {
    return <ContentWarning profile={profile} />;
  }

  const activeLinks = filterActiveLinks(profile.links, new Date());

  return <ProfileView profile={profile} links={activeLinks} />;
}

export const revalidate = 60;
