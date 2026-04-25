/**
 * ProfileView — Linktree-style profile renderer
 * Requirements: 3.2, 3.7
 */
"use client";

import type { Profile, Link, ProfileTheme } from '@/lib/domain/types';
import LeadForm from './LeadForm';

const LINK_ICONS: Record<string, string> = {
  URL: 'ri-link',
  VCF: 'ri-contacts-line',
  WHATSAPP: 'ri-whatsapp-line',
  YOUTUBE: 'ri-youtube-line',
  SPOTIFY: 'ri-spotify-line',
  TIKTOK: 'ri-tiktok-line',
};

const LINK_COLORS: Record<string, string> = {
  URL: '#03A9F4',
  VCF: '#8A2BE2',
  WHATSAPP: '#25D366',
  YOUTUBE: '#FF0000',
  SPOTIFY: '#1DB954',
  TIKTOK: '#010101',
};

function getThemeClasses(theme: ProfileTheme) {
  switch (theme.style) {
    case 'gradient':
      return {
        wrapper: 'bg-gradient-to-br from-[#0b0a0a] via-[#0f0f1a] to-[#0b0a0a]',
        card: 'bg-white/5 border border-white/10 backdrop-blur-sm',
        linkCard: 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20',
      };
    case 'glassmorphism':
      return {
        wrapper: 'bg-[#0b0a0a]',
        card: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        linkCard: 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20',
      };
    case 'minimal':
    default:
      return {
        wrapper: 'bg-[#0b0a0a]',
        card: 'bg-[#0f0f0f] border border-[#1e1e1e]',
        linkCard: 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222]',
      };
  }
}

function ShareButton({ displayName }: { displayName: string }) {
  return (
    <button
      onClick={() => navigator.share?.({ url: window.location.href, title: displayName })}
      className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
    >
      <i className="ri-share-line" />
      Share
    </button>
  );
}

interface LinkItemProps {
  link: Link;
  primaryColor: string;
  linkCardClass: string;
}

function LinkItem({ link, primaryColor, linkCardClass }: LinkItemProps) {
  const icon = LINK_ICONS[link.type] ?? 'ri-link';
  const color = LINK_COLORS[link.type] ?? primaryColor;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] group ${linkCardClass}`}
    >
      {link.thumbnailUrl ? (
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.thumbnailUrl} alt="" width={40} height={40} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}
        >
          <i className={`${icon} text-lg`} style={{ color }} />
        </div>
      )}

      <span className="text-white font-medium text-sm flex-1 truncate">{link.title}</span>
      <i className="ri-arrow-right-up-line text-[#555] text-sm flex-shrink-0 group-hover:text-white/60 transition-colors" />
    </a>
  );
}

interface ProfileViewProps {
  profile: Profile;
  links: Link[];
  showLeadForm?: boolean;
}

export default function ProfileView({ profile, links, showLeadForm = false }: ProfileViewProps) {
  const { wrapper, card, linkCard } = getThemeClasses(profile.theme);
  const { primaryColor, fontFamily } = profile.theme;

  return (
    <main
      className={`${wrapper} min-h-screen flex flex-col items-center py-12 px-4`}
      style={{ fontFamily: `${fontFamily}, Inter, sans-serif` }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="relative z-10 w-full max-w-[480px] flex flex-col gap-4">
        {/* Profile card */}
        <div className={`${card} rounded-3xl p-8 text-center`}>
          {profile.avatarUrl ? (
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 ring-4 ring-white/5" style={{ borderColor: `${primaryColor}40` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.avatarUrl} alt={profile.displayName} width={96} height={96} className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ring-4 ring-white/5"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <h1 className="text-white text-2xl font-bold mb-2">{profile.displayName}</h1>

          {profile.bio && (
            <p className="text-[#888] text-sm leading-relaxed">{profile.bio}</p>
          )}

          {/* Share button */}
          <ShareButton displayName={profile.displayName} />
        </div>

        {/* Links */}
        {links.length > 0 ? (
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <LinkItem key={link.id} link={link} primaryColor={primaryColor} linkCardClass={linkCard} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#333] text-sm">No links yet.</p>
          </div>
        )}

        {/* Lead form */}
        {showLeadForm && (
          <LeadForm profileId={profile.id} publicId={profile.publicId} />
        )}

        {/* Footer branding */}
        <div className="text-center pt-4 pb-2">
          <a href="/" className="text-[#333] text-xs hover:text-[#555] transition-colors inline-flex items-center gap-1">
            <i className="ri-nfc-line" style={{ color: primaryColor }} />
            <span>Powered by <span style={{ color: primaryColor }}>NFC ID</span></span>
          </a>
        </div>
      </div>
    </main>
  );
}
