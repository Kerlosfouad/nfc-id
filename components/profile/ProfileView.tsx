/**
 * ProfileView — Modern full-bleed profile renderer
 * Requirements: 3.2, 3.7
 */
"use client";

import Link from 'next/link';
import type { Profile, Link as ProfileLink, ProfileTheme } from '@/lib/domain/types';
import LeadForm from './LeadForm';

const LINK_ICONS: Record<string, string> = {
  URL: 'ri-link',
  VCF: 'ri-contacts-line',
  WHATSAPP: 'ri-whatsapp-line',
  YOUTUBE: 'ri-youtube-line',
  SPOTIFY: 'ri-spotify-line',
  TIKTOK: 'ri-tiktok-line',
  FACEBOOK: 'ri-facebook-fill',
  INSTAGRAM: 'ri-instagram-line',
  TWITTER: 'ri-twitter-x-line',
  LINKEDIN: 'ri-linkedin-fill',
  GITHUB: 'ri-github-fill',
  EMAIL: 'ri-mail-line',
  PHONE: 'ri-phone-line',
  TELEGRAM: 'ri-telegram-line',
  SNAPCHAT: 'ri-snapchat-line',
};

const LINK_COLORS: Record<string, string> = {
  URL: '#03A9F4',
  VCF: '#8A2BE2',
  WHATSAPP: '#25D366',
  YOUTUBE: '#FF0000',
  SPOTIFY: '#1DB954',
  TIKTOK: '#010101',
  FACEBOOK: '#1877F2',
  INSTAGRAM: '#E4405F',
  TWITTER: '#1DA1F2',
  LINKEDIN: '#0A66C2',
  GITHUB: '#ffffff',
  EMAIL: '#F59E0B',
  PHONE: '#10B981',
  TELEGRAM: '#26A5E4',
  SNAPCHAT: '#FFFC00',
};

/* ── Theme helpers ──────────────────────────────────────────── */

function getThemeVars(theme: ProfileTheme) {
  const pc = theme.primaryColor || '#03A9F4';

  switch (theme.style) {
    case 'gradient':
    case 'glassmorphism':
    case 'dark':
    case 'neon':
    case 'purple-haze':
    case 'midnight':
    case 'forest':
      return { bg: '#0a0a0a', linkBg: `${pc}18`, linkBorder: `${pc}30`, textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.5)', isDark: true };
    case 'nature':
      return { bg: '#f0fdf4', linkBg: '#dcfce7', linkBorder: '#bbf7d0', textPrimary: '#14532d', textSecondary: '#4d7c5e', isDark: false };
    case 'ocean':
      return { bg: '#ecfeff', linkBg: '#cffafe', linkBorder: '#a5f3fc', textPrimary: '#164e63', textSecondary: '#4d8997', isDark: false };
    case 'sunset':
      return { bg: '#fff7ed', linkBg: '#ffedd5', linkBorder: '#fed7aa', textPrimary: '#7c2d12', textSecondary: '#a4603b', isDark: false };
    case 'retro':
      return { bg: '#fffbeb', linkBg: '#fef3c7', linkBorder: '#fde68a', textPrimary: '#78350f', textSecondary: '#a47a3b', isDark: false };
    case 'rose-gold':
      return { bg: '#fff1f2', linkBg: '#ffe4e6', linkBorder: '#fecdd3', textPrimary: '#9f1239', textSecondary: '#c44d6a', isDark: false };
    case 'minimal':
      return { bg: '#fafafa', linkBg: '#f4f4f5', linkBorder: '#e4e4e7', textPrimary: '#18181b', textSecondary: '#71717a', isDark: false };
    default:
      return { bg: '#0a0a0a', linkBg: `${pc}18`, linkBorder: `${pc}30`, textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.5)', isDark: true };
  }
}

/* ── Save Contact (VCF download) ──────────────────────────── */

function SaveButton({ profile, isDark }: { profile: Profile; isDark: boolean }) {
  return (
    <button
      onClick={() => {
        // Generate a basic vCard and trigger download
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${profile.displayName}\n${profile.bio ? `NOTE:${profile.bio}\n` : ''}END:VCARD`;
        const blob = new Blob([vcard], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${profile.displayName}.vcf`; a.click();
        URL.revokeObjectURL(url);
      }}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        color: isDark ? '#fff' : '#1a1a1a',
        backdropFilter: 'blur(10px)',
      }}
    >
      <i className="ri-contacts-line text-base" />
      Save
    </button>
  );
}

function ShareIconButton({ displayName, isDark }: { displayName: string; isDark: boolean }) {
  return (
    <button
      onClick={() => navigator.share?.({ url: window.location.href, title: displayName })}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        color: isDark ? '#fff' : '#1a1a1a',
      }}
    >
      <i className="ri-share-forward-line text-lg" />
    </button>
  );
}

/* ── Link Item ────────────────────────────────────────────── */

function LinkItem({ link, primaryColor, themeVars, layout }: {
  link: ProfileLink;
  primaryColor: string;
  themeVars: ReturnType<typeof getThemeVars>;
  layout: 'list' | 'grid';
}) {
  const icon = LINK_ICONS[link.type] ?? 'ri-link';
  const color = LINK_COLORS[link.type] ?? primaryColor;

  if (layout === 'grid') {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl transition-all duration-200 active:scale-[0.97] group"
        style={{
          backgroundColor: themeVars.linkBg,
          border: `1px solid ${themeVars.linkBorder}`,
        }}
      >
        {link.thumbnailUrl ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${color}25` }}
          >
            <i className={`${icon} text-2xl`} style={{ color }} />
          </div>
        )}
        <span className="font-semibold text-xs text-center w-full truncate" style={{ color: themeVars.textPrimary }}>
          {link.title}
        </span>
      </a>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] group"
      style={{
        backgroundColor: themeVars.linkBg,
        border: `1px solid ${themeVars.linkBorder}`,
      }}
    >
      {link.thumbnailUrl ? (
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
          <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}25` }}
        >
          <i className={`${icon} text-2xl`} style={{ color }} />
        </div>
      )}
      <span className="font-bold text-base flex-1 truncate" style={{ color: themeVars.textPrimary }}>
        {link.title}
      </span>
    </a>
  );
}

/* ── Main ProfileView ─────────────────────────────────────── */

interface ProfileViewProps {
  profile: Profile;
  links: ProfileLink[];
  showLeadForm?: boolean;
}

export default function ProfileView({ profile, links, showLeadForm = false }: ProfileViewProps) {
  const { primaryColor, fontFamily, linksLayout = 'list', profileLayout = 'classic' } = profile.theme;
  const themeVars = getThemeVars(profile.theme);

  const cvLink = links.find(l => l.title === 'CV / Resume');
  const visibleLinks = links.filter(l => l.title !== 'CV / Resume');

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: themeVars.bg,
        fontFamily: `${fontFamily}, Inter, sans-serif`,
        color: themeVars.textPrimary,
      }}
    >
      {/* ── Cover Image ───────────────────────── */}
      <div className="relative w-full" style={{ height: profileLayout === 'hero' ? '35vh' : '30vh' }}>
        {profile.theme.coverUrl ? (
          <img
            src={profile.theme.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}60, ${primaryColor}20, ${themeVars.bg})`,
            }}
          />
        )}
        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28"
          style={{
            background: `linear-gradient(to top, ${themeVars.bg}, transparent)`,
          }}
        />
      </div>

      {/* ── Profile Info ──────────────────────── */}
      <div className="relative w-full max-w-lg mx-auto px-4 -mt-16 z-10">
        {/* Avatar + Actions row */}
        <div className="flex items-end justify-between mb-2">
          {/* Avatar with ring */}
          <div className="relative flex-shrink-0">
            <div
              className="w-[110px] h-[110px] rounded-full p-[3px]"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
                boxShadow: `0 0 24px ${primaryColor}50`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden" style={{ border: `3px solid ${themeVars.bg}` }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}
                  >
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save & Share buttons */}
          <div className="flex items-center gap-2 mb-3">
            <SaveButton profile={profile} isDark={themeVars.isDark} />
            {cvLink && (
              <a
                href={cvLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: themeVars.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  color: themeVars.isDark ? '#fff' : '#1a1a1a',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <i className="ri-file-user-line text-base" />
                CV
              </a>
            )}
            <ShareIconButton displayName={profile.displayName} isDark={themeVars.isDark} />
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-3 mb-7">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: themeVars.textPrimary }}>
            {profile.displayName}
          </h1>
          {profile.bio && (
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: themeVars.textSecondary }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* ── Links ─────────────────────────────── */}
        {visibleLinks.length > 0 ? (
          <div className={linksLayout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : "flex flex-col gap-3"}>
            {visibleLinks.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                primaryColor={primaryColor}
                themeVars={themeVars}
                layout={linksLayout}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: themeVars.textSecondary }}>No links yet.</p>
          </div>
        )}

        {/* Lead form */}
        {showLeadForm && (
          <LeadForm profileId={profile.id} publicId={profile.publicId} />
        )}

        {/* ── Footer Branding ──────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-12 pb-8">
          <Link href="/" className="flex flex-col items-center gap-2 group transition-opacity hover:opacity-80">
            <img src="/img/logo.png" alt="NFC ID" className="w-10 h-10 rounded-xl" />
            <span className="text-xs font-semibold tracking-wide" style={{ color: themeVars.textSecondary }}>
              NFC · ID
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: themeVars.textSecondary }}
          >
            Create Your Profile For Free
            <i className="ri-arrow-right-up-line text-sm" />
          </Link>
        </div>
      </div>
    </main>
  );
}
