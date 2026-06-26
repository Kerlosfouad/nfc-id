/**
 * ProfileView — Full-bleed background with centered avatar and icon+pill links
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
  TIKTOK: '#cccccc',
  FACEBOOK: '#1877F2',
  INSTAGRAM: '#E4405F',
  TWITTER: '#1DA1F2',
  LINKEDIN: '#0A66C2',
  GITHUB: '#cccccc',
  EMAIL: '#F59E0B',
  PHONE: '#10B981',
  TELEGRAM: '#26A5E4',
  SNAPCHAT: '#FFFC00',
};

/* ── Theme helpers ──────────────────────────────────────────── */

function getThemeVars(theme: ProfileTheme) {
  const pc = theme.primaryColor || '#03A9F4';
  switch (theme.style) {
    case 'nature':
      return { textPrimary: '#14532d', textSecondary: '#4d7c5e', isDark: false };
    case 'ocean':
      return { textPrimary: '#164e63', textSecondary: '#4d8997', isDark: false };
    case 'sunset':
      return { textPrimary: '#7c2d12', textSecondary: '#a4603b', isDark: false };
    case 'retro':
      return { textPrimary: '#78350f', textSecondary: '#a47a3b', isDark: false };
    case 'rose-gold':
      return { textPrimary: '#9f1239', textSecondary: '#c44d6a', isDark: false };
    case 'minimal':
      return { textPrimary: '#18181b', textSecondary: '#71717a', isDark: false };
    default:
      return { textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.6)', isDark: true };
  }
}

function getBgStyle(theme: ProfileTheme): React.CSSProperties {
  const pc = theme.primaryColor || '#03A9F4';
  if (theme.coverUrl) {
    return {
      backgroundImage: `url(${theme.coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  switch (theme.style) {
    case 'nature':    return { background: 'linear-gradient(160deg,#bbf7d0,#4ade80,#166534)' };
    case 'ocean':     return { background: 'linear-gradient(160deg,#cffafe,#22d3ee,#0e7490)' };
    case 'sunset':    return { background: 'linear-gradient(160deg,#fed7aa,#fb923c,#9a3412)' };
    case 'retro':     return { background: 'linear-gradient(160deg,#fef3c7,#fbbf24,#92400e)' };
    case 'rose-gold': return { background: 'linear-gradient(160deg,#fecdd3,#fb7185,#9f1239)' };
    case 'minimal':   return { background: '#f4f4f5' };
    case 'neon':      return { background: `linear-gradient(160deg,#0a0a0a,${pc}40,#0a0a0a)` };
    case 'purple-haze': return { background: 'linear-gradient(160deg,#1a0533,#7c3aed,#1a0533)' };
    case 'midnight':  return { background: 'linear-gradient(160deg,#020617,#1e3a5f,#020617)' };
    case 'forest':    return { background: 'linear-gradient(160deg,#052e16,#166534,#052e16)' };
    default:          return { background: `linear-gradient(160deg,#0d1117,${pc}30,#0d1117)` };
  }
}

/* ── Save Contact ─────────────────────────────────────────── */

function SaveButton({ profile, isDark, primaryColor }: { profile: Profile; isDark: boolean; primaryColor: string }) {
  function download() {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${profile.displayName}\n${profile.bio ? `NOTE:${profile.bio}\n` : ''}END:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${profile.displayName}.vcf`; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={download}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
      style={{
        backgroundColor: primaryColor,
        color: '#fff',
        boxShadow: `0 4px 20px ${primaryColor}60`,
      }}
    >
      <i className="ri-contacts-line text-base" />
      Save Contact
    </button>
  );
}

/* ── Link Row ─────────────────────────────────────────────── */

function LinkRow({ link, primaryColor, isDark }: { link: ProfileLink; primaryColor: string; isDark: boolean }) {
  const icon = LINK_ICONS[link.type] ?? 'ri-link';
  const color = LINK_COLORS[link.type] ?? primaryColor;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-0 transition-all duration-200 active:scale-[0.98]"
    >
      {/* Icon circle */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
        style={{ backgroundColor: color, boxShadow: `0 2px 12px ${color}60` }}
      >
        <i className={`${icon} text-xl text-white`} />
      </div>
      {/* Pill label — extends from icon */}
      <div
        className="flex-1 h-12 flex items-center pl-4 -ml-6 rounded-r-full"
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          className="font-semibold text-base"
          style={{ color: isDark ? '#ffffff' : '#1a1a1a' }}
        >
          {link.title}
        </span>
      </div>
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
  const { primaryColor = '#03A9F4', fontFamily } = profile.theme;
  const themeVars = getThemeVars(profile.theme);
  const bgStyle = getBgStyle(profile.theme);

  const cvLink = links.find(l => l.type === 'VCF');
  const visibleLinks = links.filter(l => l.type !== 'VCF');

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ ...bgStyle, fontFamily: `${fontFamily}, Inter, sans-serif` }}
    >
      {/* Dark overlay for readability when cover image is set */}
      {profile.theme.coverUrl && (
        <div className="fixed inset-0 bg-black/40 z-0" />
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto px-5 pt-16 pb-10">

        {/* Avatar */}
        <div
          className="w-28 h-28 rounded-full p-[3px] mb-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
            boxShadow: `0 0 32px ${primaryColor}60`,
          }}
        >
          <div
            className="w-full h-full rounded-full overflow-hidden"
            style={{ border: `3px solid ${themeVars.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'}` }}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: `${primaryColor}50` }}
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name & Bio */}
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: themeVars.textPrimary }}>
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p className="text-sm text-center mb-1 leading-relaxed" style={{ color: themeVars.textSecondary }}>
            {profile.bio}
          </p>
        )}
        <p className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: primaryColor }}>
          NFC ID
        </p>

        {/* Links */}
        <div className="w-full flex flex-col gap-3 mb-8">
          {visibleLinks.map(link => (
            <LinkRow key={link.id} link={link} primaryColor={primaryColor} isDark={themeVars.isDark} />
          ))}
        </div>

        {/* Save Contact button */}
        <SaveButton profile={profile} isDark={themeVars.isDark} primaryColor={primaryColor} />

        {/* CV link */}
        {cvLink && (
          <a
            href={cvLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: themeVars.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              color: themeVars.isDark ? '#fff' : '#1a1a1a',
              backdropFilter: 'blur(10px)',
            }}
          >
            <i className="ri-file-user-line text-base" />
            CV / Resume
          </a>
        )}

        {/* Lead form */}
        {showLeadForm && <LeadForm profileId={profile.id} publicId={profile.publicId} />}

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-12">
          <Link href="/" className="flex flex-col items-center gap-1.5 group transition-opacity hover:opacity-70">
            <img src="/img/logo.png" alt="NFC ID" className="w-8 h-8 rounded-lg opacity-70" />
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: themeVars.textSecondary }}>
              NFC · ID
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: themeVars.textSecondary }}
          >
            Create Your Profile For Free ↗
          </Link>
        </div>
      </div>
    </main>
  );
}
