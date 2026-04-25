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
      return { wrapper: 'bg-gradient-to-br from-[#0b0a0a] via-[#0f0f1a] to-[#0b0a0a]', card: 'bg-white/5 border border-white/10 backdrop-blur-sm', linkCard: 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20', text: 'text-white' };
    case 'glassmorphism':
      return { wrapper: 'bg-[#0b0a0a]', card: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]', linkCard: 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20', text: 'text-white' };
    case 'dark':
      return { wrapper: 'bg-gray-900', card: 'bg-gray-800 border border-gray-700', linkCard: 'bg-gray-800 border border-gray-700 hover:bg-gray-700', text: 'text-white' };
    case 'nature':
      return { wrapper: 'bg-green-50', card: 'bg-white border border-green-200 shadow-sm', linkCard: 'bg-white border border-green-200 hover:bg-green-100', text: 'text-green-900' };
    case 'ocean':
      return { wrapper: 'bg-cyan-50', card: 'bg-white border border-cyan-200 shadow-sm', linkCard: 'bg-white border border-cyan-200 hover:bg-cyan-100', text: 'text-cyan-900' };
    case 'sunset':
      return { wrapper: 'bg-orange-50', card: 'bg-white border border-orange-200 shadow-sm', linkCard: 'bg-white border border-orange-200 hover:bg-orange-100', text: 'text-orange-900' };
    case 'neon':
      return { wrapper: 'bg-black', card: 'bg-gray-900 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]', linkCard: 'bg-gray-900 border border-pink-500/50 hover:bg-gray-800 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]', text: 'text-pink-100' };
    case 'default':
    case 'minimal':
    default:
      return { wrapper: 'bg-gray-50', card: 'bg-white border border-gray-200 shadow-sm', linkCard: 'bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300', text: 'text-gray-900' };
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

function LinkItem({ link, primaryColor, linkCardClass, layout, textColor }: LinkItemProps & { layout?: 'list' | 'grid', textColor: string }) {
  const icon = LINK_ICONS[link.type] ?? 'ri-link';
  const color = LINK_COLORS[link.type] ?? primaryColor;

  if (layout === 'grid') {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] group ${linkCardClass}`}>
        {link.thumbnailUrl ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"><img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" /></div>
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
            <i className={`${icon} text-2xl`} style={{ color }} />
          </div>
        )}
        <span className={`font-semibold text-[11px] text-center w-full truncate ${textColor}`}>{link.title}</span>
      </a>
    );
  }

  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] group ${linkCardClass}`}>
      {link.thumbnailUrl ? (
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
          <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
          <i className={`${icon} text-lg`} style={{ color }} />
        </div>
      )}
      <span className={`font-medium text-sm flex-1 truncate ${textColor}`}>{link.title}</span>
      <i className={`ri-arrow-right-up-line text-sm flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${textColor}`} />
    </a>
  );
}

interface ProfileViewProps {
  profile: Profile;
  links: Link[];
  showLeadForm?: boolean;
}

export default function ProfileView({ profile, links, showLeadForm = false }: ProfileViewProps) {
  const { wrapper, card, linkCard, text } = getThemeClasses(profile.theme);
  const { primaryColor, fontFamily, linksLayout = 'list', profileLayout = 'classic' } = profile.theme;

  return (
    <main className={`${wrapper} min-h-screen flex flex-col items-center py-12 px-4 relative overflow-hidden`} style={{ fontFamily: `${fontFamily}, Inter, sans-serif` }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ backgroundColor: primaryColor }} />

      <div className="relative z-10 w-full max-w-[480px] flex flex-col gap-4">
        {profileLayout === 'hero' ? (
           <div className={`${card} rounded-[2rem] overflow-hidden`}>
             <div className="w-full h-32 relative" style={{ background: `linear-gradient(to bottom right, ${primaryColor}40, ${primaryColor}80)` }}>
               <div className="absolute -bottom-10 left-6">
                 {profile.avatarUrl ? (
                   <img src={profile.avatarUrl} alt={profile.displayName} className="w-20 h-20 rounded-full object-cover border-4" style={{ borderColor: 'var(--card-bg, #fff)' }} />
                 ) : (
                   <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, borderColor: 'var(--card-bg, #fff)' }}>{profile.displayName.charAt(0).toUpperCase()}</div>
                 )}
               </div>
             </div>
             <div className="pt-14 px-6 pb-6">
               <h1 className={`text-2xl font-bold mb-2 ${text}`}>{profile.displayName}</h1>
               {profile.bio && <p className={`${text} opacity-70 text-sm leading-relaxed mb-4`}>{profile.bio}</p>}
               <ShareButton displayName={profile.displayName} />
             </div>
           </div>
        ) : (
          <div className={`${card} rounded-3xl p-8 text-center`}>
            <div className="flex justify-center mb-4">
              {profile.avatarUrl ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 ring-4 ring-black/5" style={{ borderColor: `${primaryColor}40` }}>
                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ring-4 ring-black/5" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>{profile.displayName.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <h1 className={`${text} text-2xl font-bold mb-2`}>{profile.displayName}</h1>
            {profile.bio && <p className={`${text} opacity-70 text-sm leading-relaxed`}>{profile.bio}</p>}
            <ShareButton displayName={profile.displayName} />
          </div>
        )}

        {links.length > 0 ? (
          <div className={linksLayout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : "flex flex-col gap-3"}>
            {links.map((link) => (
              <LinkItem key={link.id} link={link} primaryColor={primaryColor} linkCardClass={linkCard} layout={linksLayout} textColor={text} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className={`${text} opacity-50 text-sm`}>No links yet.</p>
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
