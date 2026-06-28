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
  YOUTUBE: 'ri-youtube-fill',
  SPOTIFY: 'ri-spotify-fill',
  TIKTOK: 'ri-tiktok-line',
};

const LINK_COLORS: Record<string, string> = {
  URL: '#03A9F4',
  VCF: '#8A2BE2',
  WHATSAPP: '#25D366',
  YOUTUBE: '#FF0000',
  SPOTIFY: '#1DB954',
  TIKTOK: '#cccccc',
};

// Map from link title (lowercase) → { icon, color }
const TITLE_META: Record<string, { icon: string; color: string }> = {
  'facebook':           { icon: 'ri-facebook-fill',           color: '#1877F2' },
  'instagram':          { icon: 'ri-instagram-line',           color: '#E4405F' },
  'twitter':            { icon: 'ri-twitter-x-line',           color: '#111111' },
  'x':                  { icon: 'ri-twitter-x-line',           color: '#111111' },
  'whatsapp':           { icon: 'ri-whatsapp-line',            color: '#25D366' },
  'whatsapp channel':   { icon: 'ri-whatsapp-line',            color: '#16a34a' },
  'whatsapp business':  { icon: 'ri-whatsapp-line',            color: '#22c55e' },
  'tiktok':             { icon: 'ri-tiktok-line',              color: '#111111' },
  'youtube':            { icon: 'ri-youtube-fill',             color: '#FF0000' },
  'snapchat':           { icon: 'ri-snapchat-fill',            color: '#facc15' },
  'pinterest':          { icon: 'ri-pinterest-fill',           color: '#E60023' },
  'discord':            { icon: 'ri-discord-fill',             color: '#5865F2' },
  'telegram':           { icon: 'ri-telegram-fill',            color: '#229ED9' },
  'wechat':             { icon: 'ri-wechat-fill',              color: '#22c55e' },
  'linkedin':           { icon: 'ri-linkedin-box-fill',        color: '#0A66C2' },
  'github':             { icon: 'ri-github-fill',              color: '#24292f' },
  'behance':            { icon: 'ri-behance-fill',             color: '#1769FF' },
  'qabilah':            { icon: 'ri-quill-pen-fill',           color: '#111111' },
  'dribbble':           { icon: 'ri-dribbble-fill',            color: '#EA4C89' },
  'medium':             { icon: 'ri-medium-fill',              color: '#111111' },
  'google scholar':     { icon: 'ri-graduation-cap-fill',      color: '#111111' },
  'scopus':             { icon: 'ri-file-list-3-fill',         color: '#111111' },
  'figma':              { icon: 'ri-figma-fill',               color: '#F24E1E' },
  'slack':              { icon: 'ri-slack-fill',               color: '#4A154B' },
  'notion':             { icon: 'ri-notion-fill',              color: '#111111' },
  'google meet':        { icon: 'ri-video-chat-fill',          color: '#34A853' },
  'spotify':            { icon: 'ri-spotify-fill',             color: '#1DB954' },
  'twitch':             { icon: 'ri-twitch-fill',              color: '#9146FF' },
  'soundcloud':         { icon: 'ri-soundcloud-fill',          color: '#FF7700' },
  'telda':              { icon: 'ri-wallet-3-fill',            color: '#111111' },
  'paypal':             { icon: 'ri-paypal-fill',              color: '#003087' },
  'venmo':              { icon: 'ri-bank-card-2-fill',         color: '#3D95CE' },
  'cash app':           { icon: 'ri-money-dollar-circle-fill', color: '#111111' },
  'email':              { icon: 'ri-mail-fill',                color: '#f59e0b' },
  'gmail':              { icon: 'ri-google-fill',              color: '#EA4335' },
  'phone':              { icon: 'ri-phone-fill',               color: '#10b981' },
  'website':            { icon: 'ri-global-fill',              color: '#38bdf8' },
  'address':            { icon: 'ri-home-5-fill',              color: '#ef4444' },
  'location':           { icon: 'ri-map-pin-fill',             color: '#22d3ee' },
  'google maps':        { icon: 'ri-map-pin-2-fill',           color: '#4285F4' },
  'wordpress':          { icon: 'ri-wordpress-fill',           color: '#21759B' },
  'dev.to':             { icon: 'ri-code-box-fill',            color: '#111111' },
  'substack':           { icon: 'ri-bookmark-fill',            color: '#111111' },
  'linktree':           { icon: 'ri-asterisk',                 color: '#111111' },
  'google play':        { icon: 'ri-google-play-fill',         color: '#34A853' },
  'app store':          { icon: 'ri-app-store-fill',           color: '#0A84FF' },
  'instapay':           { icon: 'ri-bank-card-fill',           color: '#5b21b6' },
  'stack overflow':     { icon: 'ri-stack-overflow-fill',      color: '#F48024' },
  'upwork':             { icon: 'ri-briefcase-4-fill',         color: '#14a800' },
  'amazon':             { icon: 'ri-amazon-fill',              color: '#FF9900' },
  'noon':               { icon: 'ri-shopping-bag-4-fill',      color: '#FEEE00' },
  'jumia':              { icon: 'ri-shopping-cart-2-fill',     color: '#f59e0b' },
  'attachment':         { icon: 'ri-attachment-2',             color: '#10b981' },
  'cv':                 { icon: 'ri-file-user-fill',           color: '#10b981' },
  'cv / resume':        { icon: 'ri-file-user-fill',           color: '#10b981' },
  'my team':            { icon: 'ri-team-fill',                color: '#6366f1' },
};

function getLinkMeta(link: ProfileLink, primaryColor: string): { icon: string; color: string } {
  // Try title match first (case-insensitive)
  const title = link.title.toLowerCase();
  const byTitle = TITLE_META[title] ?? Object.entries(TITLE_META).find(([key]) => key.length > 2 && title.includes(key))?.[1];
  if (byTitle) return byTitle;
  // Fall back to type
  return {
    icon: LINK_ICONS[link.type] ?? 'ri-link',
    color: LINK_COLORS[link.type] ?? primaryColor,
  };
}

/* ── Theme helpers ──────────────────────────────────────────── */

function getThemeVars(theme: ProfileTheme) {
  switch (theme.style) {
    case 'minimal':
      return { textPrimary: '#18181b', textSecondary: '#52525b', isDark: false, glass: 'rgba(255,255,255,0.62)', glassBorder: 'rgba(24,24,27,0.10)' };
    case 'nature':
      return { textPrimary: '#ecfdf5', textSecondary: 'rgba(236,253,245,0.72)', isDark: true, glass: 'rgba(6,78,59,0.28)', glassBorder: 'rgba(167,243,208,0.18)' };
    case 'ocean':
      return { textPrimary: '#f0f9ff', textSecondary: 'rgba(224,242,254,0.72)', isDark: true, glass: 'rgba(8,47,73,0.30)', glassBorder: 'rgba(125,211,252,0.20)' };
    case 'sunset':
      return { textPrimary: '#fff7ed', textSecondary: 'rgba(255,237,213,0.72)', isDark: true, glass: 'rgba(124,45,18,0.26)', glassBorder: 'rgba(253,186,116,0.20)' };
    case 'retro':
      return { textPrimary: '#fffbeb', textSecondary: 'rgba(254,243,199,0.72)', isDark: true, glass: 'rgba(120,53,15,0.28)', glassBorder: 'rgba(251,191,36,0.20)' };
    case 'rose-gold':
      return { textPrimary: '#fff1f2', textSecondary: 'rgba(255,228,230,0.72)', isDark: true, glass: 'rgba(159,18,57,0.26)', glassBorder: 'rgba(251,113,133,0.20)' };
    default:
      return { textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.64)', isDark: true, glass: 'rgba(255,255,255,0.12)', glassBorder: 'rgba(255,255,255,0.14)' };
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
    case 'nature':    return { background: 'radial-gradient(circle at 70% 18%, rgba(134,239,172,0.28), transparent 32%), linear-gradient(150deg,#052e16,#0f5132 48%,#021c12)' };
    case 'ocean':     return { background: 'radial-gradient(circle at 72% 18%, rgba(34,211,238,0.34), transparent 34%), linear-gradient(150deg,#082f49,#0e7490 50%,#031826)' };
    case 'sunset':    return { background: 'radial-gradient(circle at 72% 18%, rgba(251,146,60,0.36), transparent 34%), linear-gradient(150deg,#431407,#9a3412 52%,#1f0b05)' };
    case 'retro':     return { background: 'radial-gradient(circle at 72% 18%, rgba(251,191,36,0.34), transparent 34%), linear-gradient(150deg,#451a03,#92400e 52%,#1c0c03)' };
    case 'rose-gold': return { background: 'radial-gradient(circle at 72% 18%, rgba(251,113,133,0.34), transparent 34%), linear-gradient(150deg,#4c0519,#be123c 52%,#23040e)' };
    case 'minimal':   return { background: 'linear-gradient(150deg,#fafafa,#e4e4e7 54%,#d4d4d8)' };
    case 'neon':      return { background: `radial-gradient(circle at 72% 18%, ${pc}66, transparent 34%), linear-gradient(150deg,#050505,#111827 50%,#020617)` };
    case 'purple-haze': return { background: 'radial-gradient(circle at 72% 18%, rgba(167,139,250,0.34), transparent 34%), linear-gradient(150deg,#1e1b4b,#6d28d9 54%,#16052e)' };
    case 'midnight':  return { background: 'radial-gradient(circle at 72% 18%, rgba(56,189,248,0.28), transparent 34%), linear-gradient(150deg,#020617,#1e3a5f 54%,#020617)' };
    case 'forest':    return { background: 'radial-gradient(circle at 72% 18%, rgba(34,197,94,0.30), transparent 34%), linear-gradient(150deg,#022c22,#166534 52%,#01140d)' };
    case 'dark':      return { background: `radial-gradient(circle at 72% 18%, ${pc}44, transparent 34%), linear-gradient(150deg,#030712,#111827 52%,#020617)` };
    default:          return { background: `radial-gradient(circle at 72% 18%, ${pc}4d, transparent 34%), linear-gradient(150deg,#05131f,#0f2e47 52%,#020617)` };
  }
}

/* ── Link Row ─────────────────────────────────────────────── */

function LinkRow({ link, primaryColor, themeVars }: { link: ProfileLink; primaryColor: string; themeVars: ReturnType<typeof getThemeVars> }) {
  const { icon, color } = getLinkMeta(link, primaryColor);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-0 transition-all duration-200 active:scale-[0.98]"
    >
      {/* Icon circle — use thumbnailUrl if available, else icon */}
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0 z-10 overflow-hidden"
        style={{ backgroundColor: color, boxShadow: `0 5px 18px ${color}66` }}
      >
        {link.thumbnailUrl
          ? <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <i className={`${icon} text-2xl text-white`} />
        }
      </div>
      {/* Pill label */}
      <div
        className="flex-1 h-[52px] flex items-center justify-center pl-6 -ml-7 rounded-r-[18px] border"
        style={{
          backgroundColor: themeVars.glass,
          borderColor: themeVars.glassBorder,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
        }}
      >
        <span
          className="font-semibold text-sm"
          style={{ color: themeVars.isDark ? '#ffffff' : '#1a1a1a' }}
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

  const cvLink = links.find(l => l.type === 'VCF' || l.title.toLowerCase().includes('cv') || l.title.toLowerCase().includes('resume'));
  const visibleLinks = links.filter(l => l !== cvLink);

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ ...bgStyle, fontFamily: `${fontFamily}, Inter, sans-serif` }}
    >
      {/* Dark overlay for readability when cover image is set */}
      {profile.theme.coverUrl && (
        <div className="fixed inset-0 bg-black/40 z-0" />
      )}

      <div className="relative z-10 flex min-h-screen w-full max-w-[390px] flex-col items-center mx-auto px-7 pt-16 pb-8">

        {/* Avatar */}
        <div
          className="w-[126px] h-[126px] rounded-full p-[3px] mb-4"
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
        <h1 className="text-[26px] leading-tight font-bold text-center mb-1 flex items-center gap-2" style={{ color: themeVars.textPrimary }}>
          {profile.displayName}
          {profile.isVerified && (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <circle cx="11" cy="11" r="11" fill={primaryColor} />
              <path d="M6.5 11.5L9.5 14.5L15.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </h1>
        {profile.bio && (
          <p className="text-sm text-center mb-1 leading-relaxed" style={{ color: themeVars.textSecondary }}>
            {profile.bio}
          </p>
        )}
        <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: primaryColor }}>
          NFC ID
        </p>

        {/* Save (right) + CV (left) buttons row */}
        <div className="w-full flex items-center justify-between mb-5 px-1">
          {/* CV / Resume — left */}
          {cvLink ? (
            <a
              href={cvLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: themeVars.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                color: themeVars.isDark ? '#fff' : '#1a1a1a',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${themeVars.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'}`,
              }}
            >
              <i className="ri-file-user-line text-base" />
              CV
            </a>
          ) : <div />}

          {/* Save Contact — right */}
          <button
            onClick={() => {
              const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${profile.displayName}\n${profile.bio ? `NOTE:${profile.bio}\n` : ''}END:VCARD`;
              const blob = new Blob([vcard], { type: 'text/vcard' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${profile.displayName}.vcf`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: primaryColor,
              color: '#fff',
              boxShadow: `0 4px 16px ${primaryColor}60`,
            }}
          >
            <i className="ri-contacts-line text-base" />
            Save
          </button>
        </div>

        {/* Links */}
        <div className="w-full flex flex-col gap-2 mb-8">
          {visibleLinks.map(link => (
            <LinkRow key={link.id} link={link} primaryColor={primaryColor} themeVars={themeVars} />
          ))}
        </div>

        {/* Lead form */}
        {showLeadForm && <LeadForm profileId={profile.id} publicId={profile.publicId} />}

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-8">
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
