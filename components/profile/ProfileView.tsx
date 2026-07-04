/**
 * ProfileView — Full-bleed background with centered avatar and icon+pill links
 * Requirements: 3.2, 3.7
 */
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hexColor;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hexColor: string, amount = 0.78): string {
  const normalized = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hexColor;

  const r = Math.round(parseInt(normalized.slice(0, 2), 16) * amount);
  const g = Math.round(parseInt(normalized.slice(2, 4), 16) * amount);
  const b = Math.round(parseInt(normalized.slice(4, 6), 16) * amount);

  return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function isCvLink(link: ProfileLink): boolean {
  const title = link.title.toLowerCase();
  const url = link.url.toLowerCase();
  return title.includes('cv') || title.includes('resume') || url.endsWith('.pdf') || url.includes('.pdf?');
}

function isHiddenLink(link: ProfileLink): boolean {
  return !!(link.activeTo && new Date(link.activeTo) <= new Date());
}

/* ── Theme helpers ──────────────────────────────────────────── */

function getThemeVars(theme: ProfileTheme) {
  switch (theme.style) {
    case 'minimal':
      return { textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.72)', isDark: true, glass: 'rgba(255,255,255,0.12)', glassBorder: 'rgba(255,255,255,0.16)' };
    case 'rose-gold':
      return { textPrimary: '#fff1f2', textSecondary: 'rgba(255,228,230,0.72)', isDark: true, glass: 'rgba(159,18,57,0.26)', glassBorder: 'rgba(251,113,133,0.20)' };
    default:
      return { textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.64)', isDark: true, glass: 'rgba(255,255,255,0.12)', glassBorder: 'rgba(255,255,255,0.14)' };
  }
}

const THEME_COVER_URLS: Partial<Record<ProfileTheme['style'], string>> = {
  dark: '/assets/themes/dark-mode.jpeg',
  minimal: '/assets/themes/minimal.png',
  'purple-haze': '/assets/themes/purple-haze.png',
  'rose-gold': '/assets/themes/rose-gold.png',
};

function getBgStyle(theme: ProfileTheme): React.CSSProperties {
  const pc = theme.primaryColor || '#03A9F4';
  const coverUrl = theme.coverUrl || THEME_COVER_URLS[theme.style];
  if (coverUrl) {
    return {
      backgroundImage: `url(${coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  switch (theme.style) {
    case 'rose-gold': return { background: 'radial-gradient(circle at 72% 18%, rgba(190,52,85,0.28), transparent 34%), linear-gradient(150deg,#21040c,#7f1d1d 52%,#130207)' };
    case 'minimal':   return { background: 'radial-gradient(circle at 72% 18%, rgba(161,161,170,0.16), transparent 34%), linear-gradient(150deg,#111113,#27272a 54%,#070708)' };
    case 'purple-haze': return { background: 'radial-gradient(circle at 72% 18%, rgba(124,58,237,0.28), transparent 34%), linear-gradient(150deg,#11102f,#3b1d78 54%,#0c071d)' };
    case 'dark':      return { background: `radial-gradient(circle at 72% 18%, ${pc}44, transparent 34%), linear-gradient(150deg,#030712,#111827 52%,#020617)` };
    default:          return { background: `radial-gradient(circle at 72% 18%, ${pc}3d, transparent 34%), linear-gradient(150deg,#04111c,#0b2438 52%,#020617)` };
  }
}

/* ── Link Row ─────────────────────────────────────────────── */

function LinkRow({ link, primaryColor, compact = false, onOpen }: { link: ProfileLink; primaryColor: string; compact?: boolean; onOpen?: (link: ProfileLink) => void }) {
  const { icon } = getLinkMeta(link, primaryColor);
  const accentColor = darkenHex(primaryColor || '#03A9F4');

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onOpen?.(link)}
      className="flex items-center gap-0 transition-all duration-200 active:scale-[0.98]"
    >
      {/* Icon circle — use thumbnailUrl if available, else icon */}
      <div
        className={`${compact ? 'w-12 h-12' : 'w-[52px] h-[52px]'} rounded-full flex items-center justify-center flex-shrink-0 z-10 overflow-hidden`}
        style={{ backgroundColor: accentColor, boxShadow: `0 5px 18px ${withAlpha(accentColor, 0.4)}` }}
      >
        {link.thumbnailUrl
          ? <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <i className={`${icon} ${compact ? 'text-xl' : 'text-2xl'} text-white`} />
        }
      </div>
      {/* Pill label */}
      <div
        className={`flex-1 ${compact ? 'h-12 pl-5' : 'h-[52px] pl-6'} flex items-center justify-center -ml-7 rounded-r-[18px] border`}
        style={{
          backgroundColor: withAlpha(accentColor, 0.14),
          borderColor: withAlpha(accentColor, 0.26),
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px ${withAlpha(accentColor, 0.08)}`,
        }}
      >
        <span
          className="font-semibold text-sm"
          style={{ color: '#ffffff' }}
        >
          {link.title}
        </span>
      </div>
    </a>
  );
}

function LinkGridTile({ link, primaryColor, onOpen }: { link: ProfileLink; primaryColor: string; onOpen?: (link: ProfileLink) => void }) {
  const { icon } = getLinkMeta(link, primaryColor);
  const accentColor = darkenHex(primaryColor || '#03A9F4');

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onOpen?.(link)}
      className="min-h-[102px] rounded-[22px] border p-3 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 active:scale-[0.98]"
      style={{
        backgroundColor: withAlpha(accentColor, 0.14),
        borderColor: withAlpha(accentColor, 0.26),
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px ${withAlpha(accentColor, 0.08)}`,
      }}
    >
      <div
        className="h-11 w-11 rounded-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: accentColor, boxShadow: `0 5px 18px ${withAlpha(accentColor, 0.4)}` }}
      >
        {link.thumbnailUrl
          ? <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <i className={`${icon} text-xl text-white`} />
        }
      </div>
      <span className="max-w-full truncate text-sm font-semibold text-white">{link.title}</span>
    </a>
  );
}

function hasActiveVerification(profile: Profile): boolean {
  return !!profile.verifiedUntil && new Date(profile.verifiedUntil).getTime() > Date.now();
}

function VerifiedBadge() {
  return (
    <span
      className="relative inline-flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center align-middle"
      style={{
        filter: 'drop-shadow(0 3px 10px rgba(24,119,242,0.45))',
      }}
      aria-label="Verified profile"
      title="Verified profile"
    >
      <i className="ri-verified-badge-fill text-[24px] leading-none text-[#1877F2]" />
      <i className="ri-check-line absolute text-[13px] font-bold leading-none text-white" />
    </span>
  );
}

/* ── Main ProfileView ─────────────────────────────────────── */

interface ProfileViewProps {
  profile: Profile;
  links: ProfileLink[];
  showLeadForm?: boolean;
  disableAnalytics?: boolean;
}

type MessageState = 'idle' | 'submitting' | 'success' | 'error';

function ProfileMessageForm({
  profileId,
  accentColor,
  themeVars,
  previewOnly = false,
}: {
  profileId: string;
  accentColor: string;
  themeVars: ReturnType<typeof getThemeVars>;
  previewOnly?: boolean;
}) {
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<MessageState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewOnly) {
      setState('success');
      window.setTimeout(() => setState('idle'), 1600);
      return;
    }

    setState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/v1/profiles/${profileId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName, message }),
      });
      const json = await response.json();

      if (!response.ok) {
        setErrorMessage(
          json?.error?.fields?.senderName ??
          json?.error?.fields?.message ??
          json?.error?.message ??
          'Message could not be sent.'
        );
        setState('error');
        return;
      }

      setSenderName('');
      setMessage('');
      setState('success');
    } catch {
      setErrorMessage('Network error. Please try again.');
      setState('error');
    }
  }

  const canSubmit = senderName.trim().length >= 2 && message.trim().length >= 2 && state !== 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-[22px] border p-4"
      style={{
        backgroundColor: withAlpha(accentColor, 0.14),
        borderColor: withAlpha(accentColor, 0.26),
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px ${withAlpha(accentColor, 0.08)}`,
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: accentColor, boxShadow: `0 5px 18px ${withAlpha(accentColor, 0.35)}` }}
        >
          <i className="ri-message-3-line text-lg text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Send a message</p>
          <p className="text-xs" style={{ color: themeVars.textSecondary }}>Name and message only</p>
        </div>
      </div>

      <div className="space-y-2">
        <input
          value={senderName}
          onChange={(event) => setSenderName(event.target.value)}
          placeholder="Your name"
          disabled={state === 'submitting'}
          className="h-11 w-full rounded-xl border px-3 text-sm font-medium text-white outline-none transition disabled:opacity-60"
          style={{
            backgroundColor: withAlpha(accentColor, 0.13),
            borderColor: withAlpha(accentColor, 0.25),
            caretColor: accentColor,
          }}
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write your message..."
          rows={3}
          disabled={state === 'submitting'}
          className="w-full resize-none rounded-xl border px-3 py-3 text-sm font-medium text-white outline-none transition disabled:opacity-60"
          style={{
            backgroundColor: withAlpha(accentColor, 0.13),
            borderColor: withAlpha(accentColor, 0.25),
            caretColor: accentColor,
          }}
        />
      </div>

      {state === 'error' && <p className="mt-2 text-xs font-medium text-red-200">{errorMessage}</p>}
      {state === 'success' && (
        <p className="mt-2 text-xs font-semibold text-white">
          {previewOnly ? 'Preview only - message not sent.' : 'Message sent.'}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        style={{ backgroundColor: accentColor, boxShadow: `0 4px 16px ${withAlpha(accentColor, 0.45)}` }}
      >
        <i className={state === 'submitting' ? 'ri-loader-4-line animate-spin text-base' : 'ri-send-plane-2-line text-base'} />
        {state === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

export default function ProfileView({ profile, links, showLeadForm = false, disableAnalytics = false }: ProfileViewProps) {
  const { primaryColor: rawPrimaryColor = '#03A9F4', fontFamily } = profile.theme;
  const primaryColor = darkenHex(rawPrimaryColor);
  const themeVars = getThemeVars(profile.theme);
  const bgStyle = getBgStyle(profile.theme);
  const isGrid = profile.theme.linksLayout === 'grid';
  const isHero = profile.theme.profileLayout === 'hero';

  const activeLinks = links.filter(link => !isHiddenLink(link));
  const cvLink = activeLinks.find(isCvLink);
  const visibleLinks = activeLinks.filter(l => l !== cvLink);

  useEffect(() => {
    if (disableAnalytics) return;

    const payload = JSON.stringify({ eventType: 'VIEW' });
    const url = `/api/v1/analytics/${profile.id}`;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch {
      // Fall back below.
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [disableAnalytics, profile.id]);

  function recordLinkClick(link: ProfileLink) {
    if (disableAnalytics) return;

    const payload = JSON.stringify({ eventType: 'CLICK', linkId: link.id });
    const url = `/api/v1/analytics/${profile.id}`;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch {
      // Fall back below.
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <main
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ ...bgStyle, fontFamily: `${fontFamily}, Inter, sans-serif` }}
    >
      {/* Dark overlay for readability when cover image is set */}
      {profile.theme.coverUrl && (
        <div className="fixed inset-0 bg-black/40 z-0" />
      )}

      <div className={`relative z-10 flex min-h-screen w-full max-w-[390px] flex-col items-center mx-auto px-7 ${isHero ? 'pt-7' : 'pt-16'} pb-8`}>

        {/* Avatar */}
        <div className={isHero ? 'w-full rounded-[28px] border p-5 mb-5 text-center' : 'contents'} style={isHero ? {
          backgroundColor: 'rgba(255,255,255,0.10)',
          borderColor: 'rgba(255,255,255,0.16)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        } : undefined}>
          <div
            className={`${isHero ? 'w-[112px] h-[112px]' : 'w-[126px] h-[126px]'} rounded-full p-[3px] mb-4 mx-auto`}
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
              boxShadow: `0 0 32px ${primaryColor}60`,
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden"
              style={{ border: '3px solid rgba(255,255,255,0.35)' }}
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
          <h1 className="text-[26px] leading-tight font-bold text-center mb-1 flex items-center justify-center gap-2 text-white" style={{ color: '#ffffff' }}>
            {profile.displayName}
            {hasActiveVerification(profile) && <VerifiedBadge />}
          </h1>
          {profile.bio && (
            <p className="text-sm text-center mb-1 leading-relaxed" style={{ color: themeVars.textSecondary }}>
              {profile.bio}
            </p>
          )}
          <p className={`text-xs font-semibold tracking-widest uppercase ${isHero ? '' : 'mb-6'}`} style={{ color: primaryColor }}>
            LinkUp
          </p>
        </div>

        {/* Save (right) + CV (left) buttons row */}
        <div className="w-full flex items-center justify-between gap-3 mb-5 px-1">
          {/* CV / Resume — left */}
          {cvLink ? (
            <a
              href={cvLink.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordLinkClick(cvLink)}
              className="flex-1 min-w-0 flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <i className="ri-file-user-line text-base" />
              CV
            </a>
          ) : null}

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
            className={`${cvLink ? 'flex-1' : 'w-full'} min-w-0 flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-semibold transition-all active:scale-95`}
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
        <div className={`w-full mb-8 ${isGrid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
          {visibleLinks.map(link => isGrid ? (
            <LinkGridTile key={link.id} link={link} primaryColor={primaryColor} onOpen={recordLinkClick} />
          ) : (
            <LinkRow key={link.id} link={link} primaryColor={primaryColor} compact={isHero} onOpen={recordLinkClick} />
          ))}
        </div>

        <div className="w-full mb-5">
          <ProfileMessageForm
            profileId={profile.id}
            accentColor={primaryColor}
            themeVars={themeVars}
            previewOnly={disableAnalytics}
          />
        </div>

        {/* Lead form */}
        {showLeadForm && <LeadForm profileId={profile.id} publicId={profile.publicId} />}

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-8">
          <Link href="/" className="flex flex-col items-center gap-1.5 group transition-opacity hover:opacity-70">
            <img src="/img/logo.png" alt="LinkUp" className="h-20 w-20 rounded-2xl object-contain opacity-85" />
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
