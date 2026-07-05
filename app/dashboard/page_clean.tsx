"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { isOwnerEmail } from "@/lib/config/ownerAccess";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileView from "@/components/profile/ProfileView";
import AnimatedCounter from "@/components/AnimatedCounter";
import type { Link as PublicLink, Profile as PublicProfile, ProfileTheme as PublicProfileTheme } from "@/lib/domain/types";

interface LinkItem { id: string; type: string; title: string; url: string; displayOrder: number; activeFrom: string | null; activeTo: string | null; thumbnailUrl: string | null; isActive?: boolean; }
interface ProfileTheme { style: string; primaryColor: string; fontFamily: string; linksLayout?: "list" | "grid"; profileLayout?: "classic" | "hero"; coverUrl?: string | null; }
interface ProfileData { id: string; publicId: string; displayName: string; bio: string | null; avatarUrl: string | null; theme: ProfileTheme; passwordProtected: boolean; sensitiveContent: boolean; isActive: boolean; isSuspended: boolean; isVerified: boolean; primeDesignUntil: string | null; verifiedUntil: string | null; links: LinkItem[]; }

const LMETA: Record<string, { icon: string; color: string }> = {
  URL: { icon: "ri-link", color: "#03A9F4" }, VCF: { icon: "ri-contacts-line", color: "#8A2BE2" },
  WHATSAPP: { icon: "ri-whatsapp-line", color: "#25D366" }, YOUTUBE: { icon: "ri-youtube-line", color: "#FF0000" },
  SPOTIFY: { icon: "ri-spotify-line", color: "#1DB954" }, TIKTOK: { icon: "ri-tiktok-line", color: "#888" },
};
const LTYPES = ["URL", "VCF", "WHATSAPP", "YOUTUBE", "SPOTIFY", "TIKTOK"];
const COLORS = ["#03A9F4", "#8A2BE2", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#14b8a6"];
const FONTS = ["Inter", "Poppins", "Roboto", "Montserrat", "Playfair Display"];
type Tab = "home" | "analytics" | "share" | "design" | "settings";

type LinkPickerCategory = "Social" | "Professional" | "Entertainment" | "Payment" | "Contact" | "Portfolio" | "Other";
type LinkPickerItem = { label: string; icon: string; color: string; type?: string; placeholder?: string };
type LinkDraft = { type: string; title: string; url: string };
type PendingLinks = Record<string, "add" | "update" | "delete" | "toggle">;
type GoldServiceId = "design" | "verification";
type ToastItem = { id: number; msg: string; ok: boolean; visible: boolean };
type ProfileInboxMessage = { id: string; senderName: string; message: string; readAt: string | null; createdAt: string };
type ProfileInbox = { messages: ProfileInboxMessage[]; unreadCount: number };

const CLOSED_LINK_TIMESTAMP = "2000-01-01T00:00:00.000Z";
const COMPANY_WHATSAPP = "201211632456";
const GOLD_SERVICES: { id: GoldServiceId; name: string; price: number; icon: string; description: string }[] = [
  { id: "design", name: "Gold Design Themes", price: 150, icon: "ri-palette-line", description: "Premium themes, cover styling, and advanced profile layouts." },
  { id: "verification", name: "Verified Badge", price: 200, icon: "ri-verified-badge-line", description: "Manual profile verification and the verified mark on your public profile." },
];

const analyticsMemoryCache = new Map<string, AnalyticsSummary>();
const inboxMemoryCache = new Map<string, ProfileInbox>();

function isFutureDate(value: string | null | undefined): boolean {
  return !!value && new Date(value).getTime() > Date.now();
}

function normalizeLinkUrl(rawUrl: string, label: string) {
  const value = rawUrl.trim();
  if (!value) return value;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;

  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes("email") || normalizedLabel.includes("gmail")) {
    return value.includes("@") ? `mailto:${value}` : value;
  }
  if (normalizedLabel.includes("phone")) {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }
  if (normalizedLabel.includes("whatsapp")) {
    return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
  }

  return `https://${value}`;
}

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(response.ok ? "Invalid server response" : "Server error. Please try again after the database update finishes.");
  }
}

function isLinkHidden(link: Pick<LinkItem, "activeTo">): boolean {
  return !!(link.activeTo && new Date(link.activeTo) <= new Date());
}

function isCvLink(link: Pick<LinkItem, "type" | "title">): boolean {
  const title = link.title.toLowerCase();
  return link.type === "VCF" || title.includes("cv") || title.includes("resume");
}

function buildPreviewData(profile: ProfileData): { previewProfile: PublicProfile; previewLinks: PublicLink[] } {
  const now = new Date();
  const previewProfile: PublicProfile = {
    ...profile,
    ownerId: "",
    pinHash: null,
    theme: profile.theme as PublicProfileTheme,
    primeDesignUntil: profile.primeDesignUntil ? new Date(profile.primeDesignUntil) : null,
    verifiedUntil: profile.verifiedUntil ? new Date(profile.verifiedUntil) : null,
    createdAt: now,
    updatedAt: now,
  };
  const previewLinks: PublicLink[] = profile.links.map(link => ({
    ...link,
    profileId: profile.id,
    type: link.type as PublicLink["type"],
    activeFrom: link.activeFrom ? new Date(link.activeFrom) : null,
    activeTo: link.activeTo ? new Date(link.activeTo) : null,
    createdAt: now,
    updatedAt: now,
  }));

  return { previewProfile, previewLinks };
}

function reorderPayload(links: LinkItem[]) {
  return {
    links: links.map((link, displayOrder) => ({ id: link.id, displayOrder })),
  };
}

const LINK_PICKER_SECTIONS: { category: LinkPickerCategory; items: LinkPickerItem[] }[] = [
  {
    category: "Social",
    items: [
      { label: "Facebook", icon: "ri-facebook-fill", color: "#1877F2" },
      { label: "Instagram", icon: "ri-instagram-line", color: "#E4405F" },
      { label: "Twitter", icon: "ri-twitter-x-line", color: "#111111" },
      { label: "WhatsApp", icon: "ri-whatsapp-line", color: "#25D366", type: "WHATSAPP", placeholder: "https://wa.me/..." },
      { label: "WhatsApp Channel", icon: "ri-whatsapp-line", color: "#16a34a" },
      { label: "WhatsApp Business", icon: "ri-whatsapp-line", color: "#22c55e" },
      { label: "TikTok", icon: "ri-tiktok-line", color: "#111111", type: "TIKTOK", placeholder: "https://tiktok.com/@username" },
      { label: "YouTube", icon: "ri-youtube-fill", color: "#FF0000", type: "YOUTUBE", placeholder: "https://youtube.com/..." },
      { label: "Snapchat", icon: "ri-snapchat-fill", color: "#facc15" },
      { label: "Pinterest", icon: "ri-pinterest-fill", color: "#E60023" },
      { label: "Discord", icon: "ri-discord-fill", color: "#5865F2" },
      { label: "Telegram", icon: "ri-telegram-fill", color: "#229ED9" },
      { label: "WeChat", icon: "ri-wechat-fill", color: "#22c55e" },
    ],
  },
  {
    category: "Professional",
    items: [
      { label: "LinkedIn", icon: "ri-linkedin-box-fill", color: "#0A66C2" },
      { label: "GitHub", icon: "ri-github-fill", color: "#24292f" },
      { label: "Behance", icon: "ri-behance-fill", color: "#1769FF" },
      { label: "Qabilah", icon: "ri-quill-pen-fill", color: "#111111" },
      { label: "Dribbble", icon: "ri-dribbble-fill", color: "#EA4C89" },
      { label: "Medium", icon: "ri-medium-fill", color: "#111111" },
      { label: "Stack Overflow", icon: "ri-stack-overflow-fill", color: "#F48024" },
      { label: "Upwork", icon: "ri-briefcase-4-fill", color: "#14a800" },
      { label: "Amazon", icon: "ri-amazon-fill", color: "#232F3E" },
      { label: "Noon", icon: "ri-shopping-bag-4-fill", color: "#FEEE00" },
      { label: "Jumia", icon: "ri-shopping-cart-2-fill", color: "#f59e0b" },
      { label: "Google Scholar", icon: "ri-graduation-cap-fill", color: "#111111" },
      { label: "Scopus", icon: "ri-file-list-3-fill", color: "#111111" },
      { label: "Figma", icon: "ri-figma-fill", color: "#F24E1E" },
      { label: "Slack", icon: "ri-slack-fill", color: "#4A154B" },
      { label: "Notion", icon: "ri-notion-fill", color: "#111111" },
      { label: "Google Meet", icon: "ri-video-chat-fill", color: "#34A853" },
    ],
  },
  {
    category: "Entertainment",
    items: [
      { label: "Spotify", icon: "ri-spotify-fill", color: "#1DB954", type: "SPOTIFY", placeholder: "https://open.spotify.com/..." },
      { label: "Twitch", icon: "ri-twitch-fill", color: "#9146FF" },
      { label: "SoundCloud", icon: "ri-soundcloud-fill", color: "#FF7700" },
    ],
  },
  {
    category: "Payment",
    items: [
      { label: "Instapay", icon: "ri-bank-card-fill", color: "#5b21b6" },
      { label: "Telda", icon: "ri-wallet-3-fill", color: "#111111" },
      { label: "PayPal", icon: "ri-paypal-fill", color: "#003087" },
      { label: "Venmo", icon: "ri-bank-card-2-fill", color: "#3D95CE" },
      { label: "Cash App", icon: "ri-money-dollar-circle-fill", color: "#111111" },
    ],
  },
  {
    category: "Contact",
    items: [
      { label: "Email", icon: "ri-mail-fill", color: "#f59e0b" },
      { label: "Phone", icon: "ri-phone-fill", color: "#10b981" },
      { label: "Website", icon: "ri-global-fill", color: "#38bdf8" },
      { label: "Address", icon: "ri-home-5-fill", color: "#ef4444" },
      { label: "Location", icon: "ri-map-pin-fill", color: "#22d3ee" },
      { label: "Google Maps", icon: "ri-map-pin-2-fill", color: "#4285F4" },
      { label: "CV", icon: "ri-file-user-fill", color: "#10b981", type: "VCF" },
      { label: "Gmail", icon: "ri-google-fill", color: "#EA4335" },
      { label: "Attachment", icon: "ri-attachment-2", color: "#10b981" },
    ],
  },
  {
    category: "Portfolio",
    items: [
      { label: "WordPress", icon: "ri-wordpress-fill", color: "#21759B" },
      { label: "Dev.to", icon: "ri-code-box-fill", color: "#111111" },
      { label: "Substack", icon: "ri-bookmark-fill", color: "#111111" },
      { label: "Linktree", icon: "ri-asterisk", color: "#111111" },
      { label: "Google Play", icon: "ri-google-play-fill", color: "#34A853" },
      { label: "App Store", icon: "ri-app-store-fill", color: "#0A84FF" },
    ],
  },
  {
    category: "Other",
    items: [
      { label: "Custom Link", icon: "ri-link", color: "#c2410c", type: "URL", placeholder: "https://..." },
    ],
  },
];

const TITLE_META = LINK_PICKER_SECTIONS
  .flatMap(section => section.items)
  .reduce<Record<string, { icon: string; color: string }>>((acc, item) => {
    acc[item.label.toLowerCase()] = { icon: item.icon, color: item.color };
    return acc;
  }, {});

function getLinkMeta(link: Pick<LinkItem, "type" | "title">): { icon: string; color: string } {
  const title = link.title.toLowerCase();
  const exact = TITLE_META[title];
  if (exact) return exact;
  const fuzzy = Object.entries(TITLE_META).find(([key]) => key.length > 2 && title.includes(key));
  return fuzzy?.[1] ?? LMETA[link.type] ?? { icon: "ri-link", color: "#03A9F4" };
}

const PRESET_THEMES = [
  { id: "dark", name: "Dark Mode", desc: "Sleek blue-black interface", colors: ["#020617", "#0f172a", "#1d4ed8", "#dbeafe"], premium: false, accent: "#1d4ed8", coverUrl: "/assets/themes/dark-mode.jpeg" },
  { id: "minimal", name: "Minimal", desc: "Soft monochrome elegance", colors: ["#111113", "#27272a", "#71717a", "#e4e4e7"], premium: false, accent: "#71717a", coverUrl: "/assets/themes/minimal.png" },
  { id: "purple-haze", name: "Purple Haze", desc: "Deep purples and lavender", colors: ["#11102f", "#3b1d78", "#5b21b6", "#ddd6fe"], premium: false, accent: "#5b21b6", coverUrl: "/assets/themes/purple-haze.png" },
  { id: "rose-gold", name: "Rose Gold", desc: "Elegant rose glow", colors: ["#21040c", "#7f1d1d", "#9f1239", "#fecdd3"], premium: false, accent: "#9f1239", coverUrl: "/assets/themes/rose-gold.png" },
  { id: "m-motorsport", name: "M Motorsport", desc: "Gloss white, BMW blue, carbon, and race red", colors: ["#EAF2FF", "#050B14", "#0054A6", "#DC2626"], premium: false, accent: "#0054A6", coverUrl: "/assets/themes/motorsport-m.jpg" },
  { id: "royal-wave", name: "Royal Wave", desc: "Pearl white, royal blue, cyan, and gold", colors: ["#F8FAFC", "#04245C", "#0EA5E9", "#D4A72C"], premium: false, accent: "#0EA5E9", coverUrl: "/assets/themes/royal-wave.png" },
  { id: "neon-red", name: "Neon Red", desc: "Dark carbon video with red light trails", colors: ["#05070D", "#242631", "#FF2A3D", "#F8FAFC"], premium: false, accent: "#FF2A3D", coverUrl: "/assets/themes/neon-red.mp4" },
  { id: "cosmic-nebula", name: "Cosmic Nebula", desc: "Starfield video with violet, magenta, and gold", colors: ["#07040F", "#2B145F", "#F43FB1", "#FFB347"], premium: false, accent: "#F43FB1", coverUrl: "/assets/themes/cosmic-nebula.mp4" },
  { id: "electric-grid", name: "Electric Grid", desc: "Carbon grid video with electric blue light", colors: ["#030814", "#101827", "#244BFF", "#AFC4FF"], premium: false, accent: "#244BFF", coverUrl: "/assets/themes/electric-grid.mp4" },
  { id: "lava-fracture", name: "Lava Fracture", desc: "Dark fractured stone video with molten orange lines", colors: ["#050505", "#242120", "#FF5A1F", "#FFB15C"], premium: false, accent: "#FF5A1F", coverUrl: "/assets/themes/lava-fracture.mp4" },
  { id: "crimson-grid", name: "Crimson Grid", desc: "Dark tiled video with red neon grid lines", colors: ["#05070B", "#151A22", "#FF1E38", "#FF7A86"], premium: false, accent: "#FF1E38", coverUrl: "/assets/themes/crimson-grid.mp4" },
  { id: "cyber-tunnel", name: "Cyber Tunnel", desc: "Electric blue circuit tunnel video", colors: ["#010A16", "#06213A", "#03A9F4", "#8DEBFF"], premium: false, accent: "#03A9F4", coverUrl: "/assets/themes/cyber-tunnel.mp4" },
];

function isVideoUrl(url?: string | null): boolean {
  return !!url && /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

function EditProfilePanel({ profile, saving, onSave, onClose, onAddLink }: { profile: ProfileData; saving: boolean; onSave: (p: Record<string, unknown>) => void; onClose: () => void; onAddLink?: (d: LinkDraft) => void }) {
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(profile.avatarUrl ?? "");
  const [cvUploading, setCvUploading] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);

  async function handleCvUpload(file: File) {
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) return;
    setCvUploading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "x-user-id": session?.user.id ?? "",
        },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onAddLink?.({ type: "VCF", title: "CV", url: json.url });
      onClose();
    } catch (err) {
      console.error("CV upload error:", err);
      alert("Upload failed: " + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setCvUploading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#03A9F4]/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Edit Profile</h3><button onClick={onClose} className="text-white/40 hover:text-white"><i className="ri-close-line" /></button></div>
      <div><label className="text-xs text-white/40 block mb-1">Display Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" /></div>
      <div><label className="text-xs text-white/40 block mb-1">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" /></div>
      <div><label className="text-xs text-white/40 block mb-1">Avatar URL</label><input value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="https://..." /></div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onSave({ displayName: name, bio: bio || null, avatarUrl: avatar || null })} disabled={saving} className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        <button
          onClick={() => cvRef.current?.click()}
          disabled={cvUploading}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          title="Upload CV / Resume (PDF)"
        >
          {cvUploading
            ? <><i className="ri-loader-4-line animate-spin text-base" /><span>Uploading...</span></>
            : <><i className="ri-file-upload-line text-base" /><span>Upload CV</span></>
          }
        </button>
        <input ref={cvRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
      </div>
    </div>
  );
}

function AddLinkForm({ saving, onSubmit, onCancel }: { saving: boolean; onSubmit: (d: LinkDraft) => void; onCancel: () => void }) {
  const categories = ["All", ...LINK_PICKER_SECTIONS.map(s => s.category)];
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LinkPickerItem | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [url, setUrl] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const closingRef = useRef(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    // Keep the exit quick so the sheet does not feel like a duplicate is lingering.
    setTimeout(onCancel, 180);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = LINK_PICKER_SECTIONS
    .filter(section => activeCategory === "All" || section.category === activeCategory)
    .map(section => ({
      ...section,
      items: section.items.filter(item => !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)),
    }))
    .filter(section => section.items.length > 0);

  function selectItem(item: LinkPickerItem) {
    setSelected(item);
    setCustomTitle(item.label);
    if (query.startsWith("http://") || query.startsWith("https://")) setUrl(query);
  }

  function submitSelected() {
    if (!selected || !url.trim() || submitted) return;
    const type = selected.type && LTYPES.includes(selected.type) ? selected.type : "URL";
    setSubmitted(true);
    onSubmit({ type, title: customTitle.trim() || selected.label, url: normalizeLinkUrl(url, selected.label) });
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center transition-all duration-150 ${visible ? "bg-black/70 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`flex h-[86svh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#111] text-white shadow-2xl transition-transform duration-150 ease-out sm:h-[760px] sm:max-w-2xl sm:rounded-3xl ${visible ? "translate-y-0" : "translate-y-full"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-white/10" />

        <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === category ? "bg-[#03A9F4] text-white" : "bg-white/[0.06] text-white/50 hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              placeholder="Search or paste a link..."
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          {visibleSections.length === 0 ? (
            <div className="py-14 text-center">
              <i className="ri-search-line text-4xl text-white/15" />
              <p className="mt-3 text-sm text-white/40">No link type found</p>
            </div>
          ) : (
            <div className="space-y-8">
              {visibleSections.map(section => (
                <section key={section.category}>
                  <h3 className="mb-4 text-base font-bold text-white">{section.category}</h3>
                  <div className="grid grid-cols-3 gap-x-5 gap-y-8">
                    {section.items.map(item => {
                      const isSelected = selected?.label === item.label;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => selectItem(item)}
                          className={`flex min-h-[86px] flex-col items-center justify-start gap-2 rounded-2xl px-1 py-2 text-center transition-all ${
                            isSelected ? "bg-[#03A9F4]/15 ring-1 ring-[#03A9F4]/50" : "hover:bg-white/[0.05]"
                          }`}
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
                            <i className={`${item.icon} text-4xl`} style={{ color: item.color }} />
                          </span>
                          <span className="text-sm leading-tight text-white/80">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="shrink-0 border-t border-white/10 bg-[#161616] px-4 py-3">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                <i className={`${selected.icon} text-2xl`} style={{ color: selected.color }} />
              </span>
              <input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#03A9F4]/60"
                placeholder={selected.label}
              />
            </div>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#03A9F4]/60"
                placeholder={selected.placeholder ?? "https://..."}
                autoFocus
              />
              <button
                type="button"
                onClick={submitSelected}
                disabled={saving || submitted || !url.trim()}
                className="rounded-xl bg-[#03A9F4] px-4 py-2 text-sm font-bold text-white disabled:opacity-35"
              >
                {saving || submitted ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-white/10 bg-[#111] p-4">
          <button type="button" onClick={handleClose} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] text-base font-semibold text-white/70 hover:bg-white/[0.07]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLinkForm({ link, saving, onSubmit, onCancel, onDelete }: { link: LinkItem; saving: boolean; onSubmit: (p: Record<string, unknown>) => void; onCancel: () => void; onDelete?: () => void }) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const isHidden = isLinkHidden(link);
  const [visible, setVisible] = useState(!isHidden);
  const [directLink, setDirectLink] = useState(!!(link as LinkItem & { directLink?: boolean }).directLink);

  function handleSave() {
    const patch: Record<string, unknown> = { title, url: normalizeLinkUrl(url, title) };
    if (!visible) {
      patch.activeTo = CLOSED_LINK_TIMESTAMP;
    } else {
      patch.activeTo = null;
    }
    onSubmit(patch);
  }

  const typeName = link.type.charAt(0).toUpperCase() + link.type.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Edit {typeName}</h2>
          <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors"><i className="ri-close-line text-xl" /></button>
        </div>

        {/* Custom Name */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Custom Name (Optional)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={typeName}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#03A9F4]/50 transition-colors"
            autoFocus
          />
        </div>

        {/* Link */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Link</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#03A9F4]/50 transition-colors"
          />
        </div>

        {/* Visible Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Visible</span>
          <button
            onClick={() => setVisible(v => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${visible ? "bg-[#03A9F4]" : "bg-white/10"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${visible ? "left-5" : "left-1"}`} />
          </button>
        </div>

        {/* Direct Link Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Direct Link</span>
            <button
              onClick={() => setDirectLink(v => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${directLink ? "bg-[#03A9F4]" : "bg-white/10"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${directLink ? "left-5" : "left-1"}`} />
            </button>
          </div>
          {directLink && (
            <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
              <i className="ri-information-line text-white/40 text-sm mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/40">When Direct Link is enabled, visitors to your page will be redirected to the specified link immediately.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {onDelete
            ? <button onClick={onDelete} className="p-2 text-white/30 hover:text-red-400 transition-colors"><i className="ri-delete-bin-line text-base" /></button>
            : <span />
          }
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-white text-black rounded-xl hover:bg-white/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageUploadModal({ title, current, onSave, onClose }: {
  title: string;
  current: string | null;
  onSave: (url: string | null) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [uploading, setUploading] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSave() {
    if (!preview || preview === current) { onSave(preview); return; }
    // If it's a data URL (newly selected), upload to Supabase storage
    if (preview.startsWith("data:")) {
      setUploading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const blob = await fetch(preview).then(r => r.blob());
        const ext = blob.type.split("/")[1] || "jpg";
        const path = `avatars/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("profiles").upload(path, blob, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("profiles").getPublicUrl(path);
        onSave(data.publicUrl);
      } catch {
        // fallback: save as data URL
        onSave(preview);
      } finally {
        setUploading(false);
      }
    } else {
      onSave(preview);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-[#141414] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="font-bold text-base">{title}</h3>
          <p className="text-xs text-white/40 mt-0.5">Choose a photo</p>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <i className="ri-close-line text-sm" />
        </button>

        {/* Preview area */}
        <div
          className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-white/30 transition-colors cursor-pointer relative bg-[#0f0f0f] flex items-center justify-center mb-4"
          onClick={() => fileRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <div className="text-center">
              <i className="ri-image-add-line text-4xl text-white/20 block mb-2" />
              <p className="text-xs text-white/30">Click or drag to upload</p>
            </div>
          }
          {preview && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
              <i className="ri-edit-line text-white text-2xl" />
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={uploading}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-all">
            {uploading ? <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin" />Uploading...</span> : "Save"}
          </button>
          {preview && (
            <button onClick={() => setPreview(null)}
              className="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all">
              Delete
            </button>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all whitespace-nowrap">
            Choose
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableLinks({ links, onMoveTo, onEditLink, onUpdateLink, onDeleteLink, saving }: {
  links: LinkItem[];
  onMoveTo: (from: number, to: number) => void;
  onEditLink: (l: LinkItem) => void;
  onUpdateLink: (id: string, p: Record<string, unknown>) => void;
  onDeleteLink: (id: string) => void;
  saving: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // optimistic hidden state
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    links.forEach(l => { if (isLinkHidden(l)) s.add(l.id); });
    return s;
  });
  // track IDs that have a pending toggle so we don't overwrite optimistic state
  const pendingIds = useRef<Set<string>>(new Set());

  // sync hiddenIds when links change from outside, but skip IDs with pending toggles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      links.forEach(l => {
        if (pendingIds.current.has(l.id)) return; // skip — optimistic update in flight
        const shouldBeHidden = isLinkHidden(l);
        if (shouldBeHidden) next.add(l.id); else next.delete(l.id);
      });
      return next;
    });
  }, [links.map(l => l.id + l.activeTo).join()]);

  function onMouseDown(e: React.MouseEvent, i: number) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const rect = itemRefs.current[i]?.getBoundingClientRect();
    if (!rect) return;
    setDragging(i);
    setStartY(e.clientY - rect.top);
    setPos({ x: rect.left, y: rect.top });

    function onMove(ev: MouseEvent) {
      setPos({ x: rect!.left, y: ev.clientY - startY });
      // find which item we're hovering
      if (!containerRef.current) return;
      const items = Array.from(containerRef.current.children) as HTMLElement[];
      for (let j = 0; j < items.length; j++) {
        const r = items[j].getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) { setDragOver(j); break; }
      }
    }
    function onUp() {
      setDragging(null);
      setDragOver(null);
      if (dragging !== null && dragOver !== null && dragging !== dragOver) {
        onMoveTo(dragging, dragOver);
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function toggleLink(link: LinkItem) {
    const isHidden = hiddenIds.has(link.id);
    // mark as pending so sync effect doesn't overwrite optimistic state
    pendingIds.current.add(link.id);
    // optimistic update
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (isHidden) next.delete(link.id); else next.add(link.id);
      return next;
    });
    onUpdateLink(link.id, { activeTo: isHidden ? null : CLOSED_LINK_TIMESTAMP });
    // clear pending after server response has had time to propagate
    setTimeout(() => pendingIds.current.delete(link.id), 2000);
  }

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {links.map((link, i) => {
        const m = getLinkMeta(link);
        const isHidden = hiddenIds.has(link.id);
        const isDraggingThis = dragging === i;
        const isTarget = dragOver === i && dragging !== null && dragging !== i;

        return (
          <div
            key={link.id}
            ref={el => { itemRefs.current[i] = el; }}
            onClick={e => {
              if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("[data-drag-handle]")) return;
              onEditLink(link);
            }}
            className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 group transition-all select-none cursor-pointer
              ${isDraggingThis ? "opacity-30 border-white/20 bg-white/5" : ""}
              ${isTarget ? "border-[#03A9F4]/60 bg-[#03A9F4]/5" : ""}
              ${!isDraggingThis && !isTarget ? (isHidden ? "bg-white/2 border-white/5 opacity-60" : "bg-white/5 border-white/10 hover:border-white/20") : ""}
            `}
          >
            {/* Drag handle */}
            <div
              data-drag-handle
              onMouseDown={e => onMouseDown(e, i)}
              className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors flex-shrink-0 p-1 -ml-1"
            >
              <i className="ri-drag-move-2-line text-base" />
            </div>

            {/* Icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color + "20" }}>
              <i className={m.icon + " text-sm"} style={{ color: m.color }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{link.title}</p>
              <p className="text-xs text-white/30 truncate">{link.url}</p>
            </div>

            {/* Toggle */}
            <button
              onClick={() => toggleLink(link)}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${isHidden ? "bg-white/10" : "bg-[#03A9F4]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${isHidden ? "left-0.5" : "left-[18px]"}`} />
            </button>
          </div>
        );
      })}

      {/* Floating drag clone */}
      {dragging !== null && (
        <div
          className="fixed pointer-events-none z-50 rounded-xl border border-[#03A9F4]/60 bg-[#1a1a1a] shadow-2xl px-3 py-2.5 flex items-center gap-3"
          style={{ left: pos.x, top: pos.y, width: itemRefs.current[dragging]?.offsetWidth ?? 300 }}
        >
          <i className="ri-drag-move-2-line text-[#03A9F4] text-base flex-shrink-0" />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getLinkMeta(links[dragging]).color + "20" }}>
            <i className={getLinkMeta(links[dragging]).icon + " text-sm"} style={{ color: getLinkMeta(links[dragging]).color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{links[dragging]?.title}</p>
            <p className="text-xs text-white/30 truncate">{links[dragging]?.url}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeTab({ profile, saving, pendingLinks, unreadMessages, onOpenInbox, onPatch, onAddLink, onEditLink, onDeleteLink, onMove, onMoveTo, onPreview, editOpen, setEditOpen, addOpen, setAddOpen, editLink, setEditLink, onUpdateLink, onAddLinkSubmit }: {
  profile: ProfileData; saving: boolean; onPatch: (p: Record<string, unknown>) => void; onAddLink: () => void; onEditLink: (l: LinkItem) => void; onDeleteLink: (id: string) => void; onMove: (i: number, d: "up" | "down") => void; onMoveTo: (from: number, to: number) => void; onPreview: () => void;
  pendingLinks: PendingLinks;
  unreadMessages: number;
  onOpenInbox: () => void;
  editOpen: boolean; setEditOpen: (v: boolean) => void; addOpen: boolean; setAddOpen: (v: boolean) => void; editLink: LinkItem | null; setEditLink: (l: LinkItem | null) => void;
  onUpdateLink: (id: string, p: Record<string, unknown>) => void; onAddLinkSubmit: (d: LinkDraft) => void;
}) {
  const [avatarModal, setAvatarModal] = useState(false);
  const [coverModal, setCoverModal] = useState(false);
  const regularLinks = profile.links.filter(link => !isCvLink(link));
  // Optimistic toggle state for link visibility
  const [optimisticHidden, setOptimisticHidden] = useState<Record<string, boolean>>({});
  // Clear optimistic overrides when server data arrives
  useEffect(() => { setOptimisticHidden({}); }, [profile.links]);

  return (<>
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-5">
      <div className="flex-1 min-w-0 space-y-3 lg:space-y-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] text-white">
          {/* Cover + Avatar wrapper */}
          <div className="relative">
            <div
              className="relative h-36 sm:h-52 flex items-center justify-center cursor-pointer group overflow-hidden"
              style={{ background: profile.theme?.coverUrl ? undefined : "linear-gradient(to bottom right, rgba(3,169,244,0.2), rgba(138,43,226,0.1), #111)" }}
              onClick={() => setCoverModal(true)}
            >
              {profile.theme?.coverUrl
                ? isVideoUrl(profile.theme.coverUrl)
                  ? <video src={profile.theme.coverUrl} className="w-full h-full object-cover absolute inset-0" autoPlay muted loop playsInline aria-hidden="true" />
                  : <img src={profile.theme.coverUrl} alt="cover" className="w-full h-full object-cover absolute inset-0" />
                : <i className="ri-image-line text-white/10 text-5xl group-hover:text-white/20 transition-colors" />
              }
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <div className="flex items-center gap-2 bg-black/60 rounded-xl px-3 py-1.5">
                  <i className="ri-camera-line text-white text-sm" />
                  <span className="text-white text-xs font-semibold">Change Cover</span>
                </div>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setCoverModal(true); }}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg lg:hidden"
                aria-label="Change cover"
              >
                <i className="ri-image-add-line text-lg" />
              </button>
            </div>
            {/* Avatar — outside overflow-hidden cover so it shows properly */}
            <div className="absolute bottom-0 left-4 sm:left-5 translate-y-1/2 z-10" onClick={e => { e.stopPropagation(); setAvatarModal(true); }}>
              <div className="relative group/av cursor-pointer">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full border-4 border-[#1a1a1a] object-cover sm:h-24 sm:w-24" />
                  : <div className="h-20 w-20 rounded-full border-4 border-[#1a1a1a] bg-gradient-to-br from-[#03A9F4]/40 to-[#8A2BE2]/40 flex items-center justify-center text-2xl font-bold sm:h-24 sm:w-24">{profile.displayName.charAt(0).toUpperCase()}</div>
                }
                <button
                  type="button"
                  className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-white shadow-md lg:hidden"
                  aria-label="Change avatar"
                >
                  <i className="ri-image-add-line text-base" />
                </button>
                <div className="absolute inset-0 rounded-full bg-black/50 hidden items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity lg:flex">
                  <i className="ri-camera-line text-white text-sm" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-14">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold leading-tight text-white sm:text-xl">{profile.displayName}</h2>
                {profile.bio && <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{profile.bio}</p>}
                <a href={`/profile/${profile.publicId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-mono text-[#03A9F4]">
                  <span className="truncate">/profile/{profile.publicId}</span>
                  <i className="ri-external-link-line shrink-0" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(!editOpen)}
                className="flex h-9 shrink-0 items-center justify-center rounded-full bg-[#03A9F4] px-3 text-xs font-bold text-white shadow-lg lg:hidden"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={onOpenInbox}
                className="relative hidden h-9 shrink-0 items-center justify-center rounded-full border border-[#03A9F4]/35 bg-[#03A9F4]/10 px-3 text-xs font-bold text-[#03A9F4] transition hover:bg-[#03A9F4]/15 sm:flex"
              >
                <i className="ri-message-3-line mr-1.5 text-base" />
                Messages
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#03A9F4] px-1.5 text-[10px] font-black text-white shadow-lg">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        {editOpen && <EditProfilePanel profile={profile} saving={saving} onSave={(p) => { onPatch(p); setEditOpen(false); }} onClose={() => setEditOpen(false)} onAddLink={onAddLinkSubmit} />}
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 text-white sm:p-6">
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <h3 className="text-base font-semibold">Your Links</h3>
            <button onClick={onAddLink} className="flex items-center gap-1.5 rounded-xl bg-[#03A9F4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#03A9F4]/80 sm:px-4"><i className="ri-add-line text-base" />Add Link</button>
          </div>
          {editLink && (
            <EditLinkForm
              link={editLink}
              saving={saving}
              onSubmit={(p) => { onUpdateLink(editLink.id, p); setEditLink(null); }}
              onCancel={() => setEditLink(null)}
              onDelete={() => { onDeleteLink(editLink.id); setEditLink(null); }}
            />
          )}
          {regularLinks.length === 0 && !addOpen
            ? <div className="text-center py-8 border border-dashed border-white/10 rounded-xl"><i className="ri-links-line text-3xl text-white/20 mb-2 block" /><p className="text-white/30 text-sm">No links yet</p></div>
            : <div className="space-y-3">
              {regularLinks.map((link) => {
                const i = profile.links.findIndex(l => l.id === link.id);
                const m = getLinkMeta(link);
                const serverHidden = isLinkHidden(link);
                const isHidden = link.id in optimisticHidden ? optimisticHidden[link.id] : !!serverHidden;
                const isPending = !!pendingLinks[link.id];
                return (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("linkIndex", String(i)); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; (e.currentTarget as HTMLElement).classList.add("border-[#03A9F4]/50"); }}
                    onDragLeave={e => { (e.currentTarget as HTMLElement).classList.remove("border-[#03A9F4]/50"); }}
                    onDrop={e => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.remove("border-[#03A9F4]/50");
                      const from = parseInt(e.dataTransfer.getData("linkIndex"));
                      if (from === i || isNaN(from)) return;
                      onMoveTo(from, i);
                    }}
                    onClick={e => { if (!(e.target as HTMLElement).closest("button")) onEditLink(link); }}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-all cursor-pointer sm:gap-4 sm:px-4 sm:py-3.5 ${isHidden ? "border-white/5 bg-white/2 opacity-60" : "border-white/10 bg-white/5 hover:border-white/20"} ${isPending ? "pointer-events-none" : ""}`}
                  >
                    {/* Drag handle */}
                    <i className="ri-draggable text-base text-white/20 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0 group-hover:text-white/50" />

                    {/* Icon */}
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ backgroundColor: m.color + "20" }}>
                      <i className={m.icon + " text-base"} style={{ color: m.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{link.title}</p>
                      <p className="truncate text-xs text-white/30">{link.url}</p>
                    </div>

                    {/* Toggle — optimistic: update UI instantly, API in background */}
                    <button
                      onClick={() => {
                        if (isPending) return;
                        const newHidden = !isHidden;
                        // Instantly update UI
                        setOptimisticHidden(prev => ({ ...prev, [link.id]: newHidden }));
                        // Fire API in background (don't await / don't block)
                        onUpdateLink(link.id, { activeTo: newHidden ? CLOSED_LINK_TIMESTAMP : null });
                      }}
                      disabled={isPending}
                      className={`relative h-5 w-9 rounded-full transition-all flex-shrink-0 ${isHidden ? "bg-white/10" : "bg-[#03A9F4]"}`}
                      title={isHidden ? "Enable link" : "Disable link"}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${isHidden ? "left-0.5" : "left-[18px]"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
      <div className="hidden lg:block w-full lg:w-52 flex-shrink-0">
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3">
          <button type="button" onClick={onPreview} className="flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 lg:px-4 py-3 lg:py-3.5 hover:bg-white/5 hover:border-white/20 group">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10"><i className="ri-eye-line text-white/60 group-hover:text-white text-sm lg:text-base" /></div>
            <div className="text-center lg:text-left"><p className="text-xs lg:text-sm font-semibold">Preview</p><p className="text-[10px] lg:text-xs text-white/40 hidden lg:block">View Profile</p></div>
          </button>
          <button onClick={() => setEditOpen(!editOpen)} className="w-full flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 lg:px-4 py-3 lg:py-3.5 hover:bg-white/5 hover:border-white/20 group">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10"><i className="ri-pencil-line text-white/60 group-hover:text-white text-sm lg:text-base" /></div>
            <div className="text-center lg:text-left"><p className="text-xs lg:text-sm font-semibold">Edit</p><p className="text-[10px] lg:text-xs text-white/40 hidden lg:block">Name, bio, avatar</p></div>
          </button>
          <div className={"flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 bg-[#1a1a1a] border rounded-xl px-3 lg:px-4 py-3 lg:py-3.5 " + (profile.isActive && !profile.isSuspended ? "border-green-500/20 bg-green-500/5" : "border-white/10")}>
            <div className={"w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center " + (profile.isActive && !profile.isSuspended ? "bg-green-500/10" : "bg-white/5")}><i className={"ri-shield-check-line text-sm lg:text-base " + (profile.isActive && !profile.isSuspended ? "text-green-400" : "text-white/40")} /></div>
            <div className="text-center lg:text-left"><p className="text-xs lg:text-sm font-semibold">{profile.isSuspended ? "Suspended" : profile.isActive ? "Active" : "Inactive"}</p><p className="text-[10px] lg:text-xs text-white/40 hidden lg:block">Tag status</p></div>
          </div>
        </div>
      </div>
    </div>

    {avatarModal && (
      <ImageUploadModal
        title="Profile Photo"
        current={profile.avatarUrl}
        onSave={url => { onPatch({ avatarUrl: url }); setAvatarModal(false); }}
        onClose={() => setAvatarModal(false)}
      />
    )}
    {coverModal && (
      <ImageUploadModal
        title="Cover Photo"
        current={profile.theme?.coverUrl ?? null}
        onSave={url => {
          const theme = profile.theme ?? { style: "dark", primaryColor: "#03A9F4", fontFamily: "Inter" };
          onPatch({ theme: { ...theme, coverUrl: url } });
          setCoverModal(false);
        }}
        onClose={() => setCoverModal(false)}
      />
    )}
    {addOpen && <AddLinkForm saving={saving} onSubmit={onAddLinkSubmit} onCancel={() => setAddOpen(false)} />}
  </>);
}

interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalLinkClicks: number;
  linkClickRate: number;
  contactSaves: number;
  activityTimeline: { date: string; views: number; clicks: number }[];
  linkClickDistribution: { title: string; clicks: number; fill: string }[];
  recentScans: { date: string; country: string; os: string; browser: string }[];
  linkClickDetails: { title: string; url: string; type: string; thumbnailUrl: string | null; clicks: number }[];
}

function MiniBarChart({ data }: { data: { date: string; views: number; clicks: number }[] }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(data.length - 1, 0));
  const [ready, setReady] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const maxVal = Math.max(...data.map(d => Math.max(d.views, d.clicks)), 1);
  const chartW = 320;
  const chartH = 170;
  const padX = 14;
  const padTop = 18;
  const padBottom = 34;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padTop - padBottom;
  const xFor = (i: number) => padX + (data.length <= 1 ? innerW : (i / (data.length - 1)) * innerW);
  const yFor = (value: number) => padTop + innerH - (value / maxVal) * innerH;
  const viewsPoints = data.map((d, i) => ({ x: xFor(i), y: yFor(d.views), value: d.views, date: d.date }));
  const clicksPoints = data.map((d, i) => ({ x: xFor(i), y: yFor(d.clicks), value: d.clicks, date: d.date }));
  const pathFor = (points: typeof viewsPoints) => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const labelEvery = data.length > 20 ? 5 : data.length > 14 ? 3 : data.length > 7 ? 2 : 1;
  const active = data[activeIndex] ?? data[data.length - 1];
  const activePoint = clicksPoints[activeIndex] ?? clicksPoints[clicksPoints.length - 1];
  const tooltipLeft = activePoint ? Math.min(Math.max((activePoint.x / chartW) * 100, 18), 82) : 50;

  useEffect(() => {
    setReady(false);
    const node = chartRef.current;
    if (!node) return;
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        frame = requestAnimationFrame(() => setReady(true));
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [data]);

  return (
    <div ref={chartRef} className="relative h-full w-full overflow-visible px-1 pt-14">
      {active && (
        <div
          className="absolute top-1 z-10 w-[124px] -translate-x-1/2 rounded-xl border border-white/10 bg-black/85 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${tooltipLeft}%` }}
        >
          <p className="mb-1 font-semibold text-white">{active.date}</p>
          <p className="flex items-center gap-2 text-white/60"><span className="h-2 w-2 rounded-sm bg-[#2f6be6]" /> Views <b className="ml-auto text-white">{active.views}</b></p>
          <p className="flex items-center gap-2 text-white/60"><span className="h-2 w-2 rounded-sm bg-[#35c19a]" /> Clicks <b className="ml-auto text-white">{active.clicks}</b></p>
        </div>
      )}
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-full w-full overflow-visible">
        {[0.25, 0.5, 0.75, 1].map(level => (
          <line key={level} x1={padX} x2={chartW - padX} y1={padTop + innerH * level} y2={padTop + innerH * level} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <path d={pathFor(viewsPoints)} fill="none" stroke="#2f6be6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} className="transition-all duration-700 ease-out" style={{ strokeDasharray: 1, strokeDashoffset: ready ? 0 : 1 }} />
        <path d={pathFor(clicksPoints)} fill="none" stroke="#35c19a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} className="transition-all duration-700 ease-out delay-100" style={{ strokeDasharray: 1, strokeDashoffset: ready ? 0 : 1 }} />
        {data.map((d, i) => {
          const x = xFor(i);
          const selected = i === activeIndex;
          return (
            <g key={i}>
              <rect x={x - 6} y={padTop - 8} width="12" height={innerH + 16} fill="transparent" className="cursor-pointer" onClick={() => setActiveIndex(i)} />
              <circle cx={x} cy={yFor(d.views)} r={selected ? 4 : 0} fill="#2f6be6" className="transition-all" />
              <circle cx={x} cy={yFor(d.clicks)} r={selected ? 4 : 0} fill="#35c19a" className="transition-all" />
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <text x={x} y={chartH - 8} textAnchor="middle" className="fill-white/30 text-[10px]">{d.date}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ data }: { data: { title: string; clicks: number; fill: string }[] }) {
  const [drawn, setDrawn] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const total = data.reduce((s, d) => s + d.clicks, 0);
  const donutColors = ['#03A9F4', '#8A2BE2', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  useEffect(() => {
    setDrawn(false);
    const node = chartRef.current;
    if (!node) return;
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        frame = requestAnimationFrame(() => setDrawn(true));
        observer.disconnect();
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [data]);

  if (total === 0) return <div className="flex items-center justify-center h-full text-white/20 text-xs">No data</div>;
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.clicks / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, fill: donutColors[i % donutColors.length], start, pct };
  });
  const r = 60, cx = 80, cy = 80, stroke = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div ref={chartRef} className="flex flex-col sm:flex-row items-center gap-4 w-full h-full">
      <svg viewBox="0 0 160 160" className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 -rotate-90">
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.fill}
            strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${drawn ? s.pct * circ : 0} ${circ}`}
            strokeDashoffset={-s.start * circ} className="transition-all duration-700 ease-out" />
        ))}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#1a1a1a" />
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
            <span className="text-xs text-white/60 truncate flex-1">{s.title}</span>
            <span className="text-xs font-bold text-white">{s.clicks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ profile, token, uid }: { profile: ProfileData; token: string; uid: string }) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${profile.id}:${range}`;
    const cached = analyticsMemoryCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(`/api/v1/analytics/${profile.id}?days=${range}`, {
      headers: { Authorization: "Bearer " + token, "x-user-id": uid }
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        const next = j.data ?? null;
        if (next) analyticsMemoryCache.set(cacheKey, next);
        setData(next);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.id, token, uid, range]);

  function refresh() {
    const cacheKey = `${profile.id}:${range}`;
    if (!data) setLoading(true);
    fetch(`/api/v1/analytics/${profile.id}?days=${range}&t=${Date.now()}`, {
      headers: { Authorization: "Bearer " + token, "x-user-id": uid }
    }).then(r => r.json()).then(j => {
      const next = j.data ?? null;
      if (next) analyticsMemoryCache.set(cacheKey, next);
      setData(next);
    }).catch(() => setData(null)).finally(() => setLoading(false));
  }

  const stats = [
    { label: "Views", value: data?.totalViews ?? 0, suffix: "", icon: "ri-eye-line", badge: null },
    { label: "Link Clicks", value: data?.totalLinkClicks ?? 0, suffix: "", icon: "ri-cursor-line", badge: "New" },
    { label: "Click Rate", value: data?.linkClickRate ?? 0, suffix: "%", icon: "ri-percent-line", badge: "New" },
    { label: "Contact Saves", value: data?.contactSaves ?? 0, suffix: "", icon: "ri-file-user-line", badge: "New" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#111] p-1">
          <div className="grid grid-cols-3 gap-1">
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-full px-2 py-2 text-xs font-bold transition-all ${range === r ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>
                {r === 7 ? "Last 7 days" : r === 14 ? "14 days" : "30 days"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={refresh}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform active:scale-95">
          <i className={`ri-refresh-line text-xl ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="relative min-h-[128px] overflow-hidden rounded-3xl border border-white/10 bg-[#111] p-4">
            {s.badge && (
              <span className="absolute right-3 top-3 rounded-full border border-[#03A9F4]/35 bg-[#03A9F4]/15 px-2.5 py-1 text-[11px] font-bold text-[#03A9F4]">{s.badge}</span>
            )}
            <div className="mb-5 flex items-center gap-2.5 pr-12">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07]">
                <i className={`${s.icon} text-lg text-white`} />
              </div>
              <span className="min-w-0 text-[13px] font-semibold leading-tight text-white/85">{s.label}</span>
            </div>
            {loading
              ? <div className="h-10 w-20 animate-pulse rounded-xl bg-white/5" />
              : <p className="text-[30px] font-semibold leading-none tracking-normal text-[#03A9F4] sm:text-[34px]">
                  <AnimatedCounter key={`${profile.id}-${range}-${s.label}-${s.value}`} value={s.value} suffix={s.suffix} duration={950} />
                </p>
            }
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#111] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Activity</h3>
          <div className="flex items-center gap-3 text-xs text-white/45">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2f6be6]" />Views</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#35c19a]" />Clicks</span>
          </div>
        </div>
        {loading
          ? <div className="flex h-56 items-center justify-center"><i className="ri-loader-4-line animate-spin text-3xl text-white/20" /></div>
          : !data || data.activityTimeline.every(d => d.views === 0 && d.clicks === 0)
            ? <div className="flex h-56 items-center justify-center text-sm text-white/25">No activity yet</div>
            : <div className="h-64"><MiniBarChart data={data.activityTimeline} /></div>
        }
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#111] p-5">
        <h3 className="mb-5 text-lg font-bold">Link Click Distribution</h3>
        {loading
          ? <div className="flex h-56 items-center justify-center"><i className="ri-loader-4-line animate-spin text-3xl text-white/20" /></div>
          : <div className="flex min-h-56 items-center"><DonutChart data={data?.linkClickDistribution ?? []} /></div>
        }
      </div>

      {/* Scan Details + Link Click Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Scans */}
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111]">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-lg font-bold">Scan Activity</h3>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left font-semibold text-white/45">Scan</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/45">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={2} className="px-4 py-2.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                  ))
                ) : !data || data.recentScans.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-white/25">No scans yet</td></tr>
                ) : (
                  data.recentScans.map((s, i) => (
                    <tr key={i} className="border-b border-white/10 last:border-0">
                      <td className="px-4 py-4 text-white/80">{new Date(s.date).toLocaleString(undefined, { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      <td className="px-4 py-2.5 text-right"><span className="rounded-full bg-[#03A9F4]/15 px-2.5 py-1 text-[11px] font-bold text-[#03A9F4]">New</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Link Click Details */}
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111]">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-lg font-bold">Link Click Details</h3>
          </div>
          <div className="p-5">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-16 sm:w-20" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-left font-semibold text-white/45">Link</th>
                  <th className="pb-4 text-right font-semibold text-white/45">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={2} className="px-4 py-2.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                  ))
                ) : !data || data.linkClickDetails.length === 0 ? (
                  <tr><td colSpan={2} className="py-10 text-center text-white/25">No link clicks yet</td></tr>
                ) : (
                  data.linkClickDetails.map((l, i) => {
                    const meta = getLinkMeta({ title: l.title, type: l.type });
                    return (
                      <tr key={i}>
                        <td className="min-w-0 py-4 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.07]">
                              {l.thumbnailUrl ? <img src={l.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <i className={`${meta.icon} text-3xl`} style={{ color: meta.color }} />}
                            </span>
                            <span className="min-w-0 flex-1 overflow-hidden">
                              <span className="block truncate text-base font-semibold text-white">{l.title}</span>
                              <span className="block truncate text-sm text-white/35">{l.url.replace(/^https?:\/\//, "")}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-right text-lg font-semibold text-white sm:text-xl">{l.clicks}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareTab({ profile }: { profile: ProfileData; onCopy: () => void; copied: boolean }) {
  const url = typeof window !== "undefined" ? window.location.origin + "/profile/" + profile.publicId : "/profile/" + profile.publicId;
  const qrRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<InstanceType<typeof import("qr-code-styling")["default"]> | null>(null);

  const [qrColor, setQrColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#111111");
  const [dotStyle, setDotStyle] = useState<"square" | "dots" | "rounded">("square");
  const [cornerStyle, setCornerStyle] = useState<"square" | "dot" | "extra-rounded">("square");
  const [copied, setCopied] = useState(false);

  // Init QR
  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !qrRef.current) return;
      qrRef.current.innerHTML = "";
      const qr = new QRCodeStyling({
        width: 280, height: 280,
        data: url,
        dotsOptions: { color: qrColor, type: dotStyle },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornerStyle as "square" | "dot" | "extra-rounded" },
        qrOptions: { errorCorrectionLevel: "H" },
      });
      qr.append(qrRef.current);
      qrInstance.current = qr;
    });
    return () => { cancelled = true; };
  }, [url]);

  // Update on options change
  useEffect(() => {
    qrInstance.current?.update({
      dotsOptions: { color: qrColor, type: dotStyle },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerStyle as "square" | "dot" | "extra-rounded" },
    });
  }, [qrColor, bgColor, dotStyle, cornerStyle]);

  function download() {
    qrInstance.current?.download({ name: "nfcid-qr-" + profile.publicId, extension: "png" });
  }

  function copyUrl() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareUrl() {
    if (navigator.share) {
      await navigator.share({ title: profile.displayName, text: "My LinkUp profile", url });
      return;
    }
    copyUrl();
  }

  const dotStyles: { id: "square" | "dots" | "rounded"; label: string }[] = [
    { id: "square", label: "Square" },
    { id: "dots", label: "Dots" },
    { id: "rounded", label: "Fluid" },
  ];
  const cornerStyles: { id: "square" | "dot" | "extra-rounded"; label: string }[] = [
    { id: "square", label: "Square" },
    { id: "dot", label: "Round" },
    { id: "extra-rounded", label: "Rounder" },
  ];

  return (
    <div className="w-full">
      <h2 className="font-bold text-lg sm:text-xl mb-5">Share</h2>
      <div className="flex flex-col lg:flex-row gap-5">

        {/* QR + actions */}
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ background: bgColor }}>
            <div ref={qrRef} className="w-[280px] h-[280px]" />
          </div>

          {/* Action buttons */}
          <div className="grid w-full max-w-sm grid-cols-3 gap-2">
            <button onClick={download}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2.5 text-xs font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98]">
              <i className="ri-download-line" /> Download
            </button>
            <button onClick={copyUrl}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10">
              <i className={copied ? "ri-check-line text-green-400" : "ri-link"} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={shareUrl}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#03A9F4]/30 bg-[#03A9F4]/15 px-2 py-2.5 text-xs font-bold text-[#03A9F4] transition-all hover:bg-[#03A9F4]/20">
              <i className="ri-share-forward-line" /> Share
            </button>
          </div>

          {/* URL bar */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 w-full max-w-xs">
            <i className="ri-links-line text-white/30 text-sm flex-shrink-0" />
            <span className="text-[#03A9F4] text-xs font-mono flex-1 truncate">{url}</span>
          </div>
        </div>

        {/* Customization panel */}
        <div className="w-full lg:w-64 xl:w-72 bg-[#161616] border border-white/8 rounded-2xl p-5 space-y-5">
          <h3 className="font-semibold text-sm">Customization</h3>

          {/* QR Color */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 font-medium">QR Color</label>
            <div className="flex items-center gap-2">
              <label className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer overflow-hidden flex-shrink-0" style={{ backgroundColor: qrColor }}>
                <input type="color" value={qrColor} onChange={e => setQrColor(e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
              </label>
              <input value={qrColor} onChange={e => setQrColor(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30" />
            </div>
          </div>

          {/* BG Color */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 font-medium">Background Color</label>
            <div className="flex items-center gap-2">
              <label className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer overflow-hidden flex-shrink-0" style={{ backgroundColor: bgColor }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
              </label>
              <input value={bgColor} onChange={e => setBgColor(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30" />
            </div>
          </div>

          {/* QR Style */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 font-medium">QR Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {dotStyles.map(s => (
                <button key={s.id} onClick={() => setDotStyle(s.id)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${dotStyle === s.id ? "border-white/40 bg-white/10 text-white" : "border-white/8 text-white/30 hover:border-white/20 hover:text-white/60"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eye Roundness */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 font-medium">Eye Roundness</label>
            <div className="grid grid-cols-3 gap-1.5">
              {cornerStyles.map(s => (
                <button key={s.id} onClick={() => setCornerStyle(s.id)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${cornerStyle === s.id ? "border-white/40 bg-white/10 text-white" : "border-white/8 text-white/30 hover:border-white/20 hover:text-white/60"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ profile, email, token, uid, onPatch, onRequestGold, onDeleted }: { profile: ProfileData; email: string; token: string; uid: string; onPatch: (patch: Record<string, unknown>) => Promise<void>; onRequestGold: (service?: GoldServiceId) => void; onDeleted: (profileId: string) => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [panel, setPanel] = useState<"main" | "products" | "subscription" | "security" | "support">("main");
  const [securityName, setSecurityName] = useState(profile.displayName);
  const [securityBio, setSecurityBio] = useState(profile.bio ?? "");
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: profile.displayName, email, subject: "", message: "" });
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/${profile.publicId}` : `/${profile.publicId}`;
  const designActive = isFutureDate(profile.primeDesignUntil);
  const verifiedActive = isFutureDate(profile.verifiedUntil);
  const activeLinks = profile.links.filter(link => !isLinkHidden(link)).length;
  const hiddenLinks = profile.links.length - activeLinks;

  useEffect(() => {
    setSecurityName(profile.displayName);
    setSecurityBio(profile.bio ?? "");
    setPasswords({ current: "", next: "", confirm: "" });
    setSupportForm(prev => ({ ...prev, name: profile.displayName, email }));
  }, [profile.id, profile.displayName, profile.bio, email]);

  function daysLeft(value: string | null) {
    if (!value) return null;
    return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  async function copyProfileLink() {
    await navigator.clipboard.writeText(publicUrl);
  }

  async function deleteProfile() {
    if (deleting) return;
    const ok = window.confirm(`Delete your account? This will remove your profile, free the NFC card, and allow this email to be registered again.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profile.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "x-user-id": uid },
      });
      const json = await readApiJson(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
      await createClient().auth.signOut();
      onDeleted(profile.id);
      router.push("/signup");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function saveSecurityProfile() {
    if (savingSecurity) return;
    setSavingSecurity(true);
    try {
      await onPatch({ displayName: securityName.trim() || profile.displayName, bio: securityBio.trim() || null });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSavingSecurity(false);
    }
  }

  async function changePassword() {
    if (changingPassword) return;
    if (passwords.next.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      alert("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await createClient().auth.updateUser({ password: passwords.next });
      if (error) throw error;
      setPasswords({ current: "", next: "", confirm: "" });
      alert("Password changed");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  function sendSupportMessage() {
    const name = supportForm.name.trim() || profile.displayName;
    const contactEmail = supportForm.email.trim() || email;
    const subject = supportForm.subject.trim() || "Support request";
    const messageText = supportForm.message.trim();
    if (!messageText) {
      alert("Please write your message");
      return;
    }
    const message = [
      "LinkUp support request",
      `Name: ${name}`,
      `Email: ${contactEmail}`,
      `Profile: /${profile.publicId}`,
      `Subject: ${subject}`,
      "",
      messageText,
    ].join("\n");
    window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function SettingsRow({
    icon,
    label,
    value,
    danger = false,
    active = false,
    onClick,
  }: {
    icon: string;
    label: string;
    value?: string;
    danger?: boolean;
    active?: boolean;
    onClick?: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex min-h-[52px] w-full items-center gap-3 border-t border-white/10 px-4 text-left transition-colors first:border-t-0 ${active ? "bg-white/[0.045]" : "hover:bg-white/[0.035]"} ${danger ? "text-red-400" : "text-white"}`}
      >
        <i className={`${icon} w-7 shrink-0 text-xl ${danger ? "text-red-400" : "text-white/50"}`} />
        <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
        {value ? (
          <span className="max-w-[130px] truncate text-xs text-white/45">{value}</span>
        ) : danger ? null : (
          <i className="ri-arrow-right-s-line text-xl text-white/35" />
        )}
      </button>
    );
  }

  function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 first:border-t-0">
        <span className="text-xs text-white/40">{label}</span>
        <span className={`min-w-0 truncate text-right text-sm font-semibold text-white ${mono ? "font-mono text-[#03A9F4]" : ""}`}>{value}</span>
      </div>
    );
  }

  function BackHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <button type="button" onClick={() => setPanel("main")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 hover:text-white">
          <i className="ri-arrow-left-line text-lg" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          <p className="truncate text-xs text-white/40">{subtitle}</p>
        </div>
      </div>
    );
  }

  function FieldLabel({ children }: { children: ReactNode }) {
    return <label className="mb-2 block text-sm font-bold text-white">{children}</label>;
  }

  const fieldClass = "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#03A9F4]/60";

  if (panel === "products") {
    return (
      <div className="mx-auto w-full max-w-md pb-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
          <BackHeader title="Products & Profiles" subtitle="Product, customer, and NFC profile details" />
          <div className="p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.07]">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <i className="ri-qr-code-line text-2xl text-white/55" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">{profile.displayName}</p>
                  <p className="truncate text-xs text-white/40">{email}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-[#03A9F4]">{publicUrl}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Product</p>
          </div>
          <DetailRow label="Product type" value="LinkUp Tag" />
          <DetailRow label="Tag ID" value={profile.publicId} mono />
          <DetailRow label="Status" value={profile.isSuspended ? "Suspended" : profile.isActive ? "Active" : "Inactive"} />
          <DetailRow label="Public profile" value={`/${profile.publicId}`} mono />

          <div className="px-4 pb-2 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Customer</p>
          </div>
          <DetailRow label="Name" value={profile.displayName} />
          <DetailRow label="Email" value={email || "Not available"} />
          <DetailRow label="Bio" value={profile.bio || "No bio yet"} />

          <div className="px-4 pb-2 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Profile Links</p>
          </div>
          <DetailRow label="Total links" value={`${profile.links.length}`} />
          <DetailRow label="Active links" value={`${activeLinks}`} />
          <DetailRow label="Disabled links" value={`${hiddenLinks}`} />
          <div className="p-4">
            <button type="button" onClick={copyProfileLink} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03A9F4] px-4 py-3 text-sm font-bold text-white">
              <i className="ri-file-copy-line" /> Copy profile link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (panel === "subscription") {
    const designDays = daysLeft(profile.primeDesignUntil);
    const verifiedDays = daysLeft(profile.verifiedUntil);
    const plans = [
      { id: "design" as GoldServiceId, name: "Prime Design", price: 150, active: designActive, days: designDays, icon: "ri-palette-line", features: ["Premium themes", "Grid links layout", "Hero profile layout", "Cover styling"] },
      { id: "verification" as GoldServiceId, name: "Verified Badge", price: 200, active: verifiedActive, days: verifiedDays, icon: "ri-verified-badge-line", features: ["Verified mark", "Manual review", "Trusted profile signal"] },
    ];
    return (
      <div className="mx-auto w-full max-w-md pb-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
          <BackHeader title="Subscription" subtitle="Current access and available Prime services" />
          <div className="p-4">
            <div className="rounded-2xl border border-[#03A9F4]/25 bg-[#03A9F4]/10 p-4">
              <p className="text-sm font-bold text-white">Subscription Status</p>
              <p className="mt-1 text-xs text-white/45">Details of your current active services.</p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between"><span className="text-sm text-white/45">Current plan</span><span className="text-sm font-bold text-white">{designActive || verifiedActive ? "Prime" : "Free"}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-white/45">Status</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${designActive || verifiedActive ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/50"}`}>{designActive || verifiedActive ? "Active" : "Inactive"}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-white/45">Active services</span><span className="text-sm font-bold text-white">{[designActive && "Design", verifiedActive && "Verified"].filter(Boolean).join(" + ") || "None"}</span></div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Available Services</p>
          </div>
          <div className="space-y-3 p-4 pt-0">
            {plans.map(plan => (
              <div key={plan.id} className={`rounded-2xl border p-4 ${plan.active ? "border-[#03A9F4]/35 bg-[#03A9F4]/10" : "border-white/10 bg-white/[0.03]"}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#03A9F4]/15 text-[#03A9F4]"><i className={`${plan.icon} text-xl`} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-white">{plan.name}</p>
                      <span className="rounded-full bg-[#03A9F4] px-2.5 py-1 text-xs font-bold text-white">{plan.price} EGP</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">{plan.active ? `Active${plan.days !== null ? ` - ${plan.days} days left` : ""}` : "Available to activate"}</p>
                    <div className="mt-3 grid gap-1.5">
                      {plan.features.map(feature => <p key={feature} className="flex items-center gap-2 text-xs text-white/55"><i className="ri-check-line text-[#03A9F4]" />{feature}</p>)}
                    </div>
                    {!plan.active && <button type="button" onClick={() => onRequestGold(plan.id)} className="mt-3 w-full rounded-xl border border-[#03A9F4]/25 bg-[#03A9F4]/10 px-3 py-2 text-xs font-bold text-[#03A9F4]">Request activation</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (panel === "security") {
    return (
      <div className="mx-auto w-full max-w-md pb-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
          <BackHeader title="Profile & Security" subtitle="Personal account and password settings" />

          <div className="p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-bold text-white">Personal Information</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">Update the public information visitors see on your NFC profile.</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#03A9F4]/12 text-[#03A9F4]">
                  <i className="ri-user-settings-line text-xl" />
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel>Username</FieldLabel>
                  <input value={profile.publicId} readOnly className={`${fieldClass} font-mono text-[#03A9F4]/85`} />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input value={email} readOnly className={`${fieldClass} text-white/55`} />
                </div>
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <input value={securityName} onChange={e => setSecurityName(e.target.value)} placeholder="Full Name" className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>Bio</FieldLabel>
                  <textarea value={securityBio} onChange={e => setSecurityBio(e.target.value)} maxLength={500} rows={4} placeholder="About you" className={`${fieldClass} resize-none`} />
                  <p className="mt-1 text-right text-[11px] text-white/30">{securityBio.length}/500</p>
                </div>
                <button type="button" onClick={saveSecurityProfile} disabled={savingSecurity} className="ml-auto flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-black disabled:opacity-60">
                  <i className={savingSecurity ? "ri-loader-4-line animate-spin" : "ri-save-3-line"} />
                  {savingSecurity ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#03A9F4]/15 text-[#03A9F4]">
                  <i className="ri-verified-badge-line text-xl" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Verification</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">{verifiedActive ? "Your profile has the verified badge enabled." : "Request manual review to show the verified badge on your public profile."}</p>
                  {!verifiedActive && (
                    <button type="button" onClick={() => onRequestGold("verification")} className="mt-3 rounded-xl border border-[#03A9F4]/30 bg-[#03A9F4]/10 px-3 py-2 text-xs font-bold text-[#03A9F4]">
                      Request Verification
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <i className="ri-delete-bin-line mt-0.5 text-2xl text-red-400" />
                <div>
                  <p className="text-base font-bold text-red-400">Delete Account</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">Permanently delete this profile, its links, and release the medal code for another claim.</p>
                  <button type="button" onClick={deleteProfile} disabled={deleting} className="mt-4 flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60">
                    <i className={deleting ? "ri-loader-4-line animate-spin" : "ri-delete-bin-line"} />
                    {deleting ? "Deleting..." : "Delete My Profile"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-bold text-white">Security</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">Manage your password and security settings.</p>
                </div>
                <i className="ri-shield-check-line text-2xl text-white/75" />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel>Current Password</FieldLabel>
                  <input type="password" value={passwords.current} onChange={e => setPasswords(prev => ({ ...prev, current: e.target.value }))} placeholder="Optional" className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>New Password</FieldLabel>
                  <input type="password" value={passwords.next} onChange={e => setPasswords(prev => ({ ...prev, next: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>Confirm New Password</FieldLabel>
                  <input type="password" value={passwords.confirm} onChange={e => setPasswords(prev => ({ ...prev, confirm: e.target.value }))} className={fieldClass} />
                </div>
                <button type="button" onClick={changePassword} disabled={changingPassword} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-black disabled:opacity-60">
                  <i className={changingPassword ? "ri-loader-4-line animate-spin" : "ri-lock-password-line"} />
                  {changingPassword ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (panel === "support") {
    const supportItems = [
      { icon: "ri-map-pin-line", title: "Address", lines: ["Ismailia City", "Ismailia Government, Egypt"] },
      { icon: "ri-phone-line", title: "Phone", lines: ["+20 121 163 2456"] },
      { icon: "ri-mail-line", title: "Email", lines: ["contact@nfc-id.app"] },
    ];

    return (
      <div className="mx-auto w-full max-w-md pb-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
          <BackHeader title="Contact & Support" subtitle="Talk to LinkUp support" />

          <div className="p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-base font-bold text-white">Contact Information</p>
              <p className="mt-1 text-xs text-white/45">We are here to answer your questions.</p>
              <div className="mt-5 space-y-4">
                {supportItems.map(item => (
                  <div key={item.title} className="flex gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#03A9F4]/15 text-[#03A9F4]">
                      <i className={`${item.icon} text-2xl`} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      {item.lines.map(line => <p key={line} className="mt-0.5 truncate text-sm text-white/45">{line}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-base font-bold text-white">Business Hours</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/45">Saturday - Thursday</span>
                  <span className="font-semibold text-white">10:00 AM - 10:00 PM</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/45">Friday</span>
                  <span className="font-semibold text-white/45">Closed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 pt-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-base font-bold text-white">Send Us a Message</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">Fill out the form below and we will get back to you as soon as possible.</p>

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <input value={supportForm.name} onChange={e => setSupportForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full Name" className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input type="email" value={supportForm.email} onChange={e => setSupportForm(prev => ({ ...prev, email: e.target.value }))} placeholder="Your Email" className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>Subject</FieldLabel>
                  <input value={supportForm.subject} onChange={e => setSupportForm(prev => ({ ...prev, subject: e.target.value }))} placeholder="Subject of your message" className={fieldClass} />
                </div>
                <div>
                  <FieldLabel>Message</FieldLabel>
                  <textarea value={supportForm.message} onChange={e => setSupportForm(prev => ({ ...prev, message: e.target.value }))} rows={5} placeholder="Type your message here" className={`${fieldClass} resize-none`} />
                </div>
                <button type="button" onClick={sendSupportMessage} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black">
                  <i className="ri-whatsapp-line text-lg" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md pb-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.07]">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <i className="ri-user-line text-2xl text-white/50" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{profile.displayName}</p>
            <p className="mt-0.5 truncate text-xs text-white/40">{profile.bio || email}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-[#03A9F4]">/{profile.publicId}</p>
          </div>
        </div>

        <div className="px-4 pb-2 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Account</p>
        </div>
        <SettingsRow icon="ri-qr-code-line" label="Products & Profiles" value={`${profile.links.length} links`} onClick={() => setPanel("products")} />
        <SettingsRow icon="ri-bank-card-line" label="Subscription" value={designActive || verifiedActive ? "Prime" : "Free"} onClick={() => setPanel("subscription")} />
        <SettingsRow icon="ri-user-line" label="Profile & Security" value={isFutureDate(profile.verifiedUntil) ? "Verified" : "Security"} active onClick={() => setPanel("security")} />

        <div className="px-4 pb-2 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">App Settings</p>
        </div>
        <SettingsRow icon="ri-moon-line" label="Appearance" value="Dark" />
        <SettingsRow icon="ri-global-line" label="Language" value="English" />

        <div className="px-4 pb-2 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Help & Support</p>
        </div>
        <SettingsRow icon="ri-shield-check-line" label="Privacy Policy & Terms" onClick={() => router.push("/terms")} />
        <SettingsRow icon="ri-phone-line" label="Contact & Support" onClick={() => setPanel("support")} />
        <SettingsRow icon="ri-logout-box-r-line" label="Sign Out" danger onClick={signOut} />
        <SettingsRow icon={deleting ? "ri-loader-4-line animate-spin" : "ri-delete-bin-line"} label={deleting ? "Deleting..." : "Delete Account"} danger onClick={deleteProfile} />
      </div>
    </div>
  );
}

function GoldUpgradeModal({ profile, email, initialService, onClose }: { profile: ProfileData | null; email: string; initialService?: GoldServiceId; onClose: () => void }) {
  const [serviceId, setServiceId] = useState<GoldServiceId>(initialService ?? "design");
  const [name, setName] = useState(profile?.displayName ?? "");
  const [customerEmail, setCustomerEmail] = useState(email);
  const [phone, setPhone] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const service = GOLD_SERVICES.find(item => item.id === serviceId) ?? GOLD_SERVICES[0];
  const paymentNumber = "01030732613";

  function submit() {
    const message = [
      "Gold service request",
      `Service: ${service.name}`,
      `Price: ${service.price} EGP`,
      `Name: ${name}`,
      `Email: ${customerEmail}`,
      `Phone: ${phone}`,
      `Payment method: Vodafone Cash ${paymentNumber}`,
      `Profile: ${profile ? `/profile/${profile.publicId}` : "Not selected"}`,
      `Payment screenshot: ${receiptName || "Customer will attach it in WhatsApp"}`,
      "",
      "Please review the payment screenshot and activate the service.",
    ].join("\n");
    window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onClose();
  }

  const canSubmit = name.trim() && customerEmail.trim() && phone.trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="relative max-h-[88svh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#03A9F4]/20 bg-[#111] p-4 text-white shadow-2xl sm:p-5" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white" aria-label="Close">
          <i className="ri-close-line text-lg" />
        </button>
        <div className="mb-4 flex items-start justify-between gap-4 pr-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#03A9F4]">Prime Services</p>
            <h2 className="mt-1 text-lg font-bold">Request Prime Access</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">Choose the service, pay with Vodafone Cash, then send the request on WhatsApp.</p>
          </div>
        </div>

        <div className="mb-4 grid gap-2">
          {GOLD_SERVICES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setServiceId(item.id)}
              className={`rounded-2xl border p-3 text-left transition-all ${serviceId === item.id ? "border-[#03A9F4]/65 bg-[#03A9F4]/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#03A9F4]/10 text-[#03A9F4]"><i className={item.icon} /></span>
                <span className="rounded-full bg-[#03A9F4] px-2.5 py-1 text-xs font-bold text-white">{item.price} EGP</span>
              </div>
              <p className="text-sm font-bold">{item.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">{item.description}</p>
            </button>
          ))}
        </div>

        <div className="mb-3 rounded-2xl border border-[#03A9F4]/35 bg-[#03A9F4]/10 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#03A9F4]/15 text-[#03A9F4]">
              <i className="ri-checkbox-circle-fill text-lg" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">Vodafone Cash</p>
              <p className="font-mono text-sm font-bold text-[#03A9F4]">{paymentNumber}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#03A9F4]/60" />
          <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Email" type="email" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#03A9F4]/60" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#03A9F4]/60" />
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm text-white/55 hover:border-[#03A9F4]/45">
            <span className="truncate">{receiptName || "Upload payment screenshot"}</span>
            <i className="ri-upload-cloud-2-line text-lg text-[#03A9F4]" />
            <input type="file" accept="image/*" className="hidden" onChange={e => setReceiptName(e.target.files?.[0]?.name ?? "")} />
          </label>
          <p className="text-xs leading-relaxed text-white/35">The screenshot file cannot be attached automatically through WhatsApp web links, so attach it in the WhatsApp chat after it opens.</p>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#03A9F4] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#139fe0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="ri-whatsapp-line text-lg" />
          Send Request on WhatsApp
        </button>
      </div>
    </div>
  );
}

function ProfilePreviewModal({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function closePreview() {
    setVisible(false);
    window.setTimeout(onClose, 300);
  }

  const { previewProfile, previewLinks } = buildPreviewData(profile);

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-end justify-center bg-black/75 backdrop-blur-sm transition-opacity duration-300 md:items-center ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={closePreview}
    >
      <div
        className={`isolate flex h-[88svh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#111] text-white shadow-2xl transition-all duration-300 ease-out md:h-[760px] md:max-w-[430px] md:rounded-[28px] ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-[0.985] opacity-0 md:translate-y-4"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1.5 w-28 rounded-full bg-white/10" />
        <div className="relative z-20 shrink-0 px-5 pb-4 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Preview LinkUp</h2>
              <p className="mt-1 text-sm text-white/45">See how your profile will look</p>
            </div>
            <button onClick={closePreview} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white" aria-label="Close preview">
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>
        <div className="relative z-0 min-h-0 flex-1 overflow-hidden border-y border-white/10 bg-black">
          <div className="h-full overflow-y-auto">
            <ProfileView profile={previewProfile} links={previewLinks} disableAnalytics />
          </div>
        </div>
        <div className="relative z-20 shrink-0 p-5">
          <button onClick={closePreview} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] text-base font-bold text-white hover:bg-white/[0.06]">
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageInboxSheet({
  inbox,
  loading,
  onClose,
  onMarkRead,
}: {
  inbox: ProfileInbox;
  loading: boolean;
  onClose: () => void;
  onMarkRead: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function closeSheet() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-end justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 md:items-center ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={closeSheet}
    >
      <section
        className={`flex max-h-[82svh] w-full flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#111] text-white shadow-2xl transition-transform duration-200 md:max-h-[720px] md:max-w-[440px] md:rounded-[24px] ${visible ? "translate-y-0" : "translate-y-full md:translate-y-4"}`}
        onClick={event => event.stopPropagation()}
        aria-label="Profile messages"
      >
        <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-white/10" />
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pb-4 pt-5">
          <div>
            <p className="text-xs font-semibold text-[#03A9F4]">Inbox</p>
            <h2 className="mt-1 text-xl font-bold">Profile messages</h2>
            <p className="mt-1 text-xs text-white/45">{inbox.unreadCount} unread message{inbox.unreadCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkRead}
              disabled={inbox.unreadCount === 0 || loading}
              className="h-9 rounded-full border border-white/10 px-3 text-xs font-semibold text-white/65 transition hover:bg-white/5 hover:text-white disabled:opacity-35"
            >
              Mark read
            </button>
            <button onClick={closeSheet} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/55 hover:text-white" aria-label="Close messages">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#03A9F4] border-t-transparent" />
              <p className="mt-3 text-sm text-white/45">Loading messages...</p>
            </div>
          ) : inbox.messages.length === 0 ? (
            <div className="py-14 text-center">
              <i className="ri-chat-3-line text-5xl text-white/10" />
              <p className="mt-3 text-sm font-semibold text-white/70">No messages yet</p>
              <p className="mt-1 text-xs text-white/40">Messages from your public profile will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inbox.messages.map(message => (
                <article key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{message.senderName}</p>
                      <p className="text-[11px] text-white/35">{new Date(message.createdAt).toLocaleString()}</p>
                    </div>
                    {!message.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#03A9F4] shadow-[0_0_12px_rgba(3,169,244,0.8)]" />}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{message.message}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DesignTab({ profile, saving, onSave, onRequestGold }: { profile: ProfileData; saving: boolean; onSave: (t: ProfileTheme, message?: string) => void; onRequestGold: (service?: GoldServiceId) => void }) {
  const theme = profile.theme ?? { style: "dark", primaryColor: "#03A9F4", fontFamily: "Inter" };
  const [style, setStyle] = useState(theme.style || "dark");
  const [linksLayout, setLinksLayout] = useState<"list" | "grid">(theme.linksLayout || "list");
  const [profileLayout, setProfileLayout] = useState<"classic" | "hero">(theme.profileLayout || "classic");
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const isPrime = isFutureDate(profile.primeDesignUntil);
  const { previewProfile, previewLinks } = buildPreviewData(profile);

  useEffect(() => {
    setStyle(theme.style || "dark");
    setLinksLayout(theme.linksLayout || "list");
    setProfileLayout(theme.profileLayout || "classic");
  }, [profile.id, theme.style, theme.linksLayout, theme.profileLayout]);

  function applyTheme(themeId: string) {
    const selectedTheme = PRESET_THEMES.find(t => t.id === themeId);
    if (selectedTheme?.premium && !isPrime) {
      onRequestGold("design");
      return;
    }
    const accent = selectedTheme?.accent ?? theme.primaryColor;
    setStyle(themeId);
    onSave({ style: themeId as ProfileTheme["style"], primaryColor: accent, fontFamily: theme.fontFamily, linksLayout, profileLayout, coverUrl: selectedTheme?.coverUrl }, "Theme applied successfully");
  }

  function applyLayout(ll: "list" | "grid", pl: "classic" | "hero") {
    if (!isPrime && (ll === "grid" || pl === "hero")) {
      onRequestGold("design");
      return;
    }
    setLinksLayout(ll); setProfileLayout(pl);
    onSave({ style: style as ProfileTheme["style"], primaryColor: theme.primaryColor, fontFamily: theme.fontFamily, linksLayout: ll, profileLayout: pl, coverUrl: theme.coverUrl }, "Layout applied successfully");
  }

  const filtered = PRESET_THEMES.filter(t =>
    filter === "all" ? true : filter === "free" ? !t.premium : t.premium
  );

  return (
    <div className="flex w-full gap-0 overflow-visible lg:h-[calc(100vh-60px)] lg:min-h-[600px] lg:overflow-hidden">

      {/* ── Left: scrollable content ── */}
      <div className="flex-1 space-y-6 overflow-visible pb-32 lg:overflow-y-auto lg:pr-4 lg:pb-20">
        <h2 className="font-bold text-lg sm:text-xl">Appearance</h2>

        {/* Pro banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#03A9F4]/15 to-[#03A9F4]/5 border border-[#03A9F4]/20 rounded-2xl px-5 py-3.5">
          <div className="flex items-center gap-3">
            <i className="ri-vip-crown-fill text-[#03A9F4] text-lg flex-shrink-0" />
            <span className="text-[#03A9F4] font-semibold text-sm">{isPrime ? "Prime is active for this profile" : "Prime Design costs 150 EGP and unlocks all Prime themes and layouts"}</span>
          </div>
          {!isPrime && <button onClick={() => onRequestGold("design")} className="bg-[#03A9F4]/15 text-[#03A9F4] hover:bg-[#03A9F4]/25 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">Upgrade Now</button>}
        </div>

        {/* Themes header + filter */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">Themes</h3>
            <div className="flex bg-[#1a1a1a] border border-white/8 rounded-xl p-1 gap-0.5">
              {(["all", "free", "premium"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                  {f === "all" ? "All" : f === "free" ? "Free" : "Premium"}
                </button>
              ))}
            </div>
          </div>

          {/* Themes grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(t => (
              <div key={t.id} onClick={() => applyTheme(t.id)}
                className={`cursor-pointer bg-[#141414] border rounded-2xl p-4 transition-all select-none ${style === t.id ? "border-white/60 ring-2 ring-white/10" : "border-white/8 hover:border-white/25"} ${t.premium && !isPrime ? "opacity-75" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{t.name}</h4>
                    <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{t.desc}</p>
                  </div>
                  {t.premium && (
                    <span className="text-[9px] font-bold bg-[#03A9F4]/15 text-[#03A9F4] px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0 ml-1">
                      <i className="ri-vip-crown-fill" /> Prime
                    </span>
                  )}
                </div>

                {/* Theme preview card */}
                <div
                  className="w-full h-24 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center gap-1.5 relative bg-cover bg-center"
                  style={{ backgroundColor: t.colors[0], backgroundImage: isVideoUrl(t.coverUrl) ? `url(${t.coverUrl.replace(/\.(mp4|webm|mov)(\?.*)?$/i, "-preview.png")})` : `url(${t.coverUrl})` }}
                >
                  {isVideoUrl(t.coverUrl) && (
                    <video src={t.coverUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: t.colors[1] }} />
                  <div className="relative w-14 h-1.5 rounded-full" style={{ backgroundColor: t.colors[2] }} />
                  <div className="relative w-10 h-1.5 rounded-full opacity-70" style={{ backgroundColor: t.colors[3] }} />
                  {style === t.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                      <i className="ri-check-line text-[9px] text-black font-bold" />
                    </div>
                  )}
                  {t.premium && !isPrime && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                      <span className="rounded-full bg-[#03A9F4] px-3 py-1 text-[10px] font-bold text-white">Locked</span>
                    </div>
                  )}
                </div>

                {/* Color dots */}
                <div className="flex gap-1.5 mt-2.5">
                  {t.colors.map((col, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-sm" style={{ backgroundColor: col }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layout section */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm">Layout</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Links layout */}
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Links Layout</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => applyLayout("list", profileLayout)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${linksLayout === "list" ? "bg-white text-black border-white" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}>
                  <i className="ri-list-check" /> List
                </button>
                <button onClick={() => applyLayout("grid", profileLayout)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${linksLayout === "grid" ? "bg-white text-black border-white" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}>
                  <i className="ri-grid-fill" /> Grid {!isPrime && <span className="rounded bg-[#03A9F4]/15 px-1 text-[9px] text-[#03A9F4]">Prime</span>}
                </button>
              </div>
            </div>

            {/* Profile layout */}
            <div className="bg-[#141414] border border-white/8 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Profile Layout</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => applyLayout(linksLayout, "classic")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${profileLayout === "classic" ? "bg-white/15 text-white border-white/40" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}>
                  <i className="ri-user-line" /> Classic
                </button>
                <button onClick={() => applyLayout(linksLayout, "hero")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${profileLayout === "hero" ? "bg-white/15 text-white border-white/40" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}>
                  <i className="ri-image-line" /> Hero {!isPrime && <span className="rounded bg-[#03A9F4]/15 px-1 text-[9px] text-[#03A9F4]">Prime</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: phone preview ── */}
      <div className="hidden lg:flex w-[280px] xl:w-[300px] flex-shrink-0 flex-col items-center pt-0 sticky top-0 self-start pl-4">
        <p className="text-xs text-white/30 mb-3 font-medium">Live Preview</p>
        {/* Phone frame */}
        <div className="relative w-[240px] h-[500px]">
          {/* outer shell */}
          <div className="absolute inset-0 rounded-[3rem] border-[7px] border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] bg-[#0a0a0a]" />
          {/* notch */}
          <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-20 h-4 bg-[#0a0a0a] rounded-b-2xl z-20" />
          {/* screen */}
          <div className="absolute inset-[7px] rounded-[2.4rem] overflow-hidden bg-[#111]">
            <div className="w-[375px] h-[812px] origin-top-left" style={{ transform: "scale(0.597)" }}>
              <ProfileView profile={previewProfile} links={previewLinks} disableAnalytics />
            </div>
          </div>
          {/* saving overlay */}
          {saving && (
            <div className="absolute inset-[7px] rounded-[2.4rem] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
              <i className="ri-loader-4-line text-white text-3xl animate-spin mb-2" />
              <p className="text-white text-xs font-semibold">Saving...</p>
            </div>
          )}
          {/* home indicator */}
          <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-16 h-1 bg-white/20 rounded-full z-20" />
        </div>
      </div>
    </div>
  );
}

function SystemToast({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[46px] z-[100] flex flex-col items-center gap-2 px-4 sm:top-5">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={
            "flex min-h-10 w-fit max-w-[calc(100vw-32px)] items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(3,169,244,0.28)] transition-all duration-300 ease-out sm:max-w-[420px] sm:text-sm " +
            (toast.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-[0.98] opacity-0") +
            (index > 0 ? " -mt-1 scale-[0.98]" : "") +
            (toast.ok
              ? " border-[#35c7ff]/40 bg-[#03A9F4]"
              : " border-red-300/30 bg-red-500")
          }
        >
          <span
            className={
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
            }
          >
            {toast.ok ? (
              <svg className="h-4 w-4" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  className={toast.visible ? "toast-check-path" : ""}
                  d="M4.2 10.4 8.1 14.1 15.8 5.9"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                />
              </svg>
            ) : (
              <i className="ri-error-warning-line text-base" />
            )}
          </span>
          <span className="min-w-0 leading-snug">{toast.msg}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingLinks, setPendingLinks] = useState<PendingLinks>({});
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editLink, setEditLink] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [goldRequest, setGoldRequest] = useState<GoldServiceId | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxes, setInboxes] = useState<Record<string, ProfileInbox>>({});
  const [inboxLoading, setInboxLoading] = useState(false);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>[]>>({});
  const patchSeqRef = useRef(0);
  const profile = profiles.find(p => p.id === selId) ?? profiles[0] ?? null;
  const activeInbox = profile ? (inboxes[profile.id] ?? inboxMemoryCache.get(profile.id) ?? { messages: [], unreadCount: 0 }) : { messages: [], unreadCount: 0 };

  function showToast(msg: string, ok = true) {
    const id = ++toastIdRef.current;
    const dismissDelay = 2400;
    const exitDelay = 320;

    function clearToastTimers(toastId: number) {
      toastTimersRef.current[toastId]?.forEach(clearTimeout);
      delete toastTimersRef.current[toastId];
    }

    setToasts(current => {
      const nextToast: ToastItem = { id, msg, ok, visible: false };
      const kept = current.slice(0, 1);
      const fading = current.slice(1).map(item => ({ ...item, visible: false }));

      fading.forEach(item => {
        clearToastTimers(item.id);
        const removeTimer = setTimeout(() => {
          setToasts(list => list.filter(toast => toast.id !== item.id));
          clearToastTimers(item.id);
        }, exitDelay);
        toastTimersRef.current[item.id] = [removeTimer];
      });

      return [nextToast, ...kept, ...fading].slice(0, 3);
    });

    const enterTimer = setTimeout(() => {
      setToasts(current => current.map(item => item.id === id ? { ...item, visible: true } : item));
    }, 40);

    const dismissTimer = setTimeout(() => {
      setToasts(current => current.map(item => item.id === id ? { ...item, visible: false } : item));
      const removeTimer = setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== id));
        clearToastTimers(id);
      }, exitDelay);
      toastTimersRef.current[id] = [...(toastTimersRef.current[id] ?? []), removeTimer];
    }, dismissDelay);

    toastTimersRef.current[id] = [enterTimer, dismissTimer];
  }
  function hdrs() { return { "Content-Type": "application/json", Authorization: "Bearer " + token, "x-user-id": uid }; }
  async function loadInbox(profileId: string, quiet = false) {
    if (!token || !uid) return;
    if (!quiet) setInboxLoading(true);
    try {
      const response = await fetch(`/api/v1/profiles/${profileId}/messages`, { headers: hdrs() });
      const json = await readApiJson(response);
      if (!response.ok) throw new Error(json.error?.message ?? "Failed to load messages");
      const inbox: ProfileInbox = {
        messages: json.data?.messages ?? [],
        unreadCount: json.data?.unreadCount ?? 0,
      };
      inboxMemoryCache.set(profileId, inbox);
      setInboxes(prev => ({ ...prev, [profileId]: inbox }));
    } catch (error) {
      if (!quiet) showToast(error instanceof Error ? error.message : "Failed to load messages", false);
    } finally {
      if (!quiet) setInboxLoading(false);
    }
  }
  async function markInboxRead() {
    if (!profile || activeInbox.unreadCount === 0) return;
    const profileId = profile.id;
    const readAt = new Date().toISOString();
    setInboxes(prev => ({
      ...prev,
      [profileId]: {
        ...(prev[profileId] ?? activeInbox),
        unreadCount: 0,
        messages: (prev[profileId] ?? activeInbox).messages.map(message => ({ ...message, readAt: message.readAt ?? readAt })),
      },
    }));
    try {
      const response = await fetch(`/api/v1/profiles/${profileId}/messages`, { method: "PATCH", headers: hdrs() });
      const json = await readApiJson(response);
      if (!response.ok) throw new Error(json.error?.message ?? "Failed to update messages");
      await loadInbox(profileId, true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update messages", false);
      await loadInbox(profileId, true);
    }
  }
  function openInbox() {
    if (!profile) return;
    setInboxOpen(true);
    void loadInbox(profile.id);
  }
  function removeProfile(profileId: string) {
    setProfiles(prev => {
      const next = prev.filter(p => p.id !== profileId);
      setSelId(current => current === profileId ? (next[0]?.id ?? null) : current);
      return next;
    });
    showToast("Profile deleted");
  }
  function setLinkPending(linkId: string, state: PendingLinks[string] | null) {
    setPendingLinks(prev => {
      const next = { ...prev };
      if (state) next[linkId] = state;
      else delete next[linkId];
      return next;
    });
  }

  useEffect(() => {
    createClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      if (isOwnerEmail(session.user.email)) {
        router.replace("/admin");
        return;
      }
      const tok = session.access_token;
      const uid = session.user.id;
      setToken(tok); setUid(uid); setEmail(session.user.email ?? "");
      try {
        // 1. Get profiles list
        const listRes = await fetch("/api/v1/profiles", { headers: { Authorization: "Bearer " + tok, "x-user-id": uid } });
        const listJson = await readApiJson(listRes);
        if (!listRes.ok) throw new Error(listJson.error?.message ?? "Failed to load profiles");
        const list: ProfileData[] = listJson.data ?? [];
        // 2. Fetch full data (with links + theme) for each profile in parallel
        const full = await Promise.all(list.map(async (p) => {
          if (p.theme && Array.isArray(p.links)) return p;
          try {
            const r = await fetch("/api/v1/profiles/" + p.id, { headers: { Authorization: "Bearer " + tok, "x-user-id": uid } });
            const j = await readApiJson(r);
            return j.data ? { ...j.data, links: j.data.links ?? [] } : { ...p, links: [] };
          } catch { return p; }
        }));
        setProfiles(full);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to load profiles", false);
      } finally { setLoading(false); }
    }).catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!profile || !token || !uid) return;
    void loadInbox(profile.id, true);
    // loadInbox closes over the latest auth headers and toast handler; this effect only needs to follow the selected profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, token, uid]);

  async function patchProfile(patch: Record<string, unknown>, optimisticMessage?: string) {
    if (!profile) return;
    const profileId = profile.id;
    const previousProfile = profile;
    const patchSeq = ++patchSeqRef.current;
    setSaving(true);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...patch } : p));
    if (optimisticMessage) showToast(optimisticMessage);
    try {
      const r = await fetch("/api/v1/profiles/" + profileId, { method: "PATCH", headers: hdrs(), body: JSON.stringify(patch) });
      const j = await readApiJson(r);
      if (!r.ok) throw new Error(j.error?.message ?? "Failed");
      if (patchSeq !== patchSeqRef.current) return;
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...j.data, links: j.data.links ?? p.links ?? [] } : p));
      if (!optimisticMessage) showToast("Saved");
    }
    catch (e: unknown) {
      if (patchSeq !== patchSeqRef.current) return;
      setProfiles(prev => prev.map(p => p.id === profileId ? previousProfile : p));
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      if (patchSeq === patchSeqRef.current) setSaving(false);
    }
  }
  async function addLink(data: LinkDraft) {
    if (!profile) return;
    const profileId = profile.id;
    if (isCvLink(data)) {
      const existingCv = profile.links.find(isCvLink);
      if (existingCv) {
        await updateLink(existingCv.id, { type: "VCF", title: "CV", url: data.url, activeTo: null });
        return;
      }
    }
    const tempId = "temp-" + crypto.randomUUID();
    const optimisticLink: LinkItem = {
      id: tempId,
      type: data.type,
      title: data.title,
      url: data.url,
      thumbnailUrl: null,
      displayOrder: profile.links.length,
      activeFrom: null,
      activeTo: null,
    };
    setAddOpen(false);
    setLinkPending(tempId, "add");
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: [...p.links, optimisticLink] } : p));
    try {
      const r = await fetch("/api/v1/profiles/" + profileId + "/links", { method: "POST", headers: hdrs(), body: JSON.stringify(data) });
      const j = await readApiJson(r);
      if (!r.ok) throw new Error(j.error?.message ?? "Failed");
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.map(l => l.id === tempId ? j.data : l) } : p));
      showToast("Link added");
    } catch (e: unknown) {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.filter(l => l.id !== tempId) } : p));
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      setLinkPending(tempId, null);
    }
  }
  async function updateLink(linkId: string, patch: Record<string, unknown>) {
    if (!profile) return;
    const profileId = profile.id;
    const previous = profile.links.find(l => l.id === linkId);
    const toggleOnly = "activeTo" in patch && Object.keys(patch).length === 1;
    if (!toggleOnly) setLinkPending(linkId, "update");
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.map(l => l.id === linkId ? { ...l, ...patch } : l) } : p));
    setEditLink(null);
    try {
      const r = await fetch("/api/v1/profiles/" + profileId + "/links/" + linkId, { method: "PATCH", headers: hdrs(), body: JSON.stringify(patch) });
      const j = await readApiJson(r);
      if (!r.ok) throw new Error(j.error?.message ?? "Failed");
      if (!toggleOnly) {
        setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.map(l => l.id === linkId ? j.data : l) } : p));
        showToast("Saved");
      }
    } catch (e: unknown) {
      if (previous) setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.map(l => l.id === linkId ? previous : l) } : p));
      showToast(e instanceof Error ? e.message : "Error", false);
    } finally {
      if (!toggleOnly) setLinkPending(linkId, null);
    }
  }
  async function deleteLink(linkId: string) {
    if (!profile) return;
    const profileId = profile.id;
    const deleted = profile.links.find(l => l.id === linkId);
    setLinkPending(linkId, "delete");
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: p.links.filter(l => l.id !== linkId) } : p));
    try {
      const r = await fetch("/api/v1/profiles/" + profileId + "/links/" + linkId, { method: "DELETE", headers: hdrs() });
      if (!r.ok) throw new Error("Failed");
      showToast("Deleted");
    } catch {
      if (deleted) {
        setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, links: [...p.links, deleted].sort((a, b) => a.displayOrder - b.displayOrder) } : p));
      }
      showToast("Error", false);
    } finally {
      setLinkPending(linkId, null);
    }
  }
  async function moveLink(index: number, dir: "up" | "down") {
    if (!profile) return; const links = [...profile.links]; const swap = dir === "up" ? index - 1 : index + 1; if (swap < 0 || swap >= links.length) return;
    [links[index], links[swap]] = [links[swap], links[index]]; const reordered = links.map((l, i) => ({ ...l, displayOrder: i }));
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, links: reordered } : p));
    await fetch("/api/v1/profiles/" + profile.id + "/links/order", { method: "PUT", headers: hdrs(), body: JSON.stringify(reorderPayload(reordered)) });
  }
  async function moveLinkTo(from: number, to: number) {
    if (!profile || from === to) return;
    const links = [...profile.links];
    const [moved] = links.splice(from, 1);
    links.splice(to, 0, moved);
    const reordered = links.map((l, i) => ({ ...l, displayOrder: i }));
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, links: reordered } : p));
    await fetch("/api/v1/profiles/" + profile.id + "/links/order", { method: "PUT", headers: hdrs(), body: JSON.stringify(reorderPayload(reordered)) });
  }
  function copyLink() { if (!profile) return; navigator.clipboard.writeText(window.location.origin + "/profile/" + profile.publicId); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  const NAV: { id: Tab; icon: string; label: string }[] = [
    { id: "home", icon: "ri-home-5-line", label: "Home" }, { id: "analytics", icon: "ri-bar-chart-2-line", label: "Audience" },
    { id: "share", icon: "ri-share-line", label: "Share" }, { id: "design", icon: "ri-palette-line", label: "Design" },
    { id: "settings", icon: "ri-settings-3-line", label: "Settings" },
  ];

  if (loading) return (<div className="bg-[#111] min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#03A9F4] border-t-transparent rounded-full animate-spin" /></div>);

  return (
    <div className="flex h-screen overflow-hidden bg-[#111] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {toasts.length > 0 && <SystemToast toasts={toasts} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 md:z-auto h-full w-[220px] flex-shrink-0 bg-[#0f0f0f] border-r border-white/5 flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0">
            <img src="/img/logo.png" alt="LinkUp" className="w-8 h-8" />
            <span className="hidden font-bold text-base">Link<span className="text-[#03A9F4]">Up</span></span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="md:hidden text-white/55 hover:text-white" aria-label="Close dashboard navigation">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(n => (
            <button key={n.id} type="button" onClick={() => { setTab(n.id); setSidebarOpen(false); }} className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all " + (tab === n.id ? "bg-white/10 text-white font-medium" : "text-white/60 hover:text-white hover:bg-white/5")}>
              <i className={n.icon + " text-base"} />{n.label}
            </button>
          ))}
          <button onClick={() => setGoldRequest("design")} className="mt-3 w-full rounded-xl border border-[#03A9F4]/20 bg-[#03A9F4]/10 px-3 py-3 text-left text-sm font-semibold text-[#03A9F4] hover:bg-[#03A9F4]/15">
            <span className="flex items-center gap-2"><i className="ri-vip-crown-fill" />Try Pro For Free</span>
            <span className="mt-1 block text-[10px] font-normal text-white/45">Prime services and payment review</span>
          </button>
        </nav>
        <div className="px-2 pb-2 border-t border-white/5 pt-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider px-3 mb-1.5">Your Profiles</p>
          {profiles.map(p => (
            <button key={p.id} type="button" onClick={() => setSelId(p.id)} className={"w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all " + ((selId ?? profiles[0]?.id) === p.id ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5")}>
              <div className="w-5 h-5 rounded-full bg-[#03A9F4]/20 flex items-center justify-center text-[10px] font-bold text-[#03A9F4] flex-shrink-0">{p.displayName.charAt(0).toUpperCase()}</div>
              <span className="truncate">{p.displayName}</span>
              {p.isActive && !p.isSuspended && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        <div className="px-3 py-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#03A9F4]/50 to-[#8A2BE2]/50 flex items-center justify-center text-xs font-bold flex-shrink-0">{email.charAt(0).toUpperCase()}</div>
          <p className="text-xs truncate flex-1">{email}</p>
          <button type="button" onClick={async () => { await createClient().auth.signOut(); router.push("/login"); }} className="text-white/55 hover:text-white" aria-label="Sign out"><i className="ri-logout-box-line text-sm" /></button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0f0f0f] flex-shrink-0">
          <Link href="/" className="flex items-center gap-0">
            <img src="/img/linkup-nav-mark.png" alt="LinkUp" className="h-11 w-9 object-contain" />
            <span className="hidden font-bold text-sm">Link<span className="text-[#03A9F4]">Up</span></span>
          </Link>
          <button type="button" onClick={() => setGoldRequest("design")} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#03A9F4]/40 px-3 text-xs font-semibold text-[#03A9F4]">
            <i className="ri-sparkling-2-line" />
            Try Pro For Free
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {!profile ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <i className="ri-nfc-line text-5xl text-white/10" />
              <p className="text-white/50">No profile yet. Connect your NFC card to create one.</p>
              <Link href="/connect-nfc" className="px-5 py-2.5 rounded-full bg-[#03A9F4] text-white text-sm font-semibold hover:bg-[#03A9F4]/80">Connect Your NFC Card</Link>
            </div>
          ) : (
            <div className={"h-full " + (tab === "design" ? "overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-6" : "overflow-y-auto")}>
              {tab !== "design" && (
                <div className="mx-auto max-w-5xl px-3 py-3 pb-24 sm:px-6 sm:py-6 md:pb-6">
                  <div className="hidden items-center justify-between bg-[#03A9F4]/10 border border-[#03A9F4]/20 rounded-xl px-3 sm:px-4 py-2.5 mb-3 sm:mb-5 md:flex">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      <span className="text-white/50 text-xs hidden sm:inline">You are live</span>
                      <span className="text-[#03A9F4] text-xs font-mono truncate">/profile/{profile.publicId}</span>
                    </div>
                    <button onClick={copyLink} className="text-xs text-white/40 hover:text-white flex items-center gap-1 flex-shrink-0 ml-2"><i className={copied ? "ri-check-line text-green-400" : "ri-file-copy-line"} />{copied ? "Copied!" : "Copy"}</button>
                  </div>
                  {tab === "home" && <HomeTab profile={profile} saving={saving} pendingLinks={pendingLinks} unreadMessages={activeInbox.unreadCount} onOpenInbox={openInbox} onPatch={patchProfile} onAddLink={() => setAddOpen(true)} onEditLink={setEditLink} onDeleteLink={deleteLink} onMove={moveLink} onMoveTo={moveLinkTo} onPreview={() => setPreviewOpen(true)} editOpen={editOpen} setEditOpen={setEditOpen} addOpen={addOpen} setAddOpen={setAddOpen} editLink={editLink} setEditLink={setEditLink} onUpdateLink={updateLink} onAddLinkSubmit={addLink} />}
                  {tab === "analytics" && <AnalyticsTab profile={profile} token={token} uid={uid} />}
                  {tab === "share" && <ShareTab profile={profile} onCopy={copyLink} copied={copied} />}
                  {tab === "settings" && (
                    <SettingsTab
                      profile={profile}
                      email={email}
                      token={token}
                      uid={uid}
                      onPatch={patchProfile}
                      onRequestGold={(service = "design") => setGoldRequest(service)}
                      onDeleted={removeProfile}
                    />
                  )}
                </div>
              )}
              {tab === "design" && <DesignTab profile={profile} saving={saving} onSave={(t, message) => patchProfile({ theme: t }, message)} onRequestGold={(service = "design") => setGoldRequest(service)} />}
            </div>
          )}
        </div>

        {goldRequest && (
          <GoldUpgradeModal
            profile={profile}
            email={email}
            initialService={goldRequest}
            onClose={() => setGoldRequest(null)}
          />
        )}

        {profile && previewOpen && (
          <ProfilePreviewModal profile={profile} onClose={() => setPreviewOpen(false)} />
        )}

        {profile && inboxOpen && (
          <MessageInboxSheet
            inbox={activeInbox}
            loading={inboxLoading}
            onClose={() => setInboxOpen(false)}
            onMarkRead={markInboxRead}
          />
        )}

        {profile && (tab === "home" || tab === "design") && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="fixed bottom-[78px] left-1/2 z-50 flex h-11 min-w-[190px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#181818]/95 px-8 text-sm font-bold text-white shadow-xl backdrop-blur-xl md:hidden"
          >
            <i className="ri-eye-line text-lg" />
            Preview
          </button>
        )}

        {profile && tab === "home" && (
          <button
            type="button"
            onClick={openInbox}
            className="fixed bottom-[82px] left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#03A9F4]/35 bg-[#101010]/95 text-[#03A9F4] shadow-xl backdrop-blur-xl md:hidden"
            aria-label="Open messages"
          >
            <i className="ri-message-3-line text-xl" />
            {activeInbox.unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#03A9F4] px-1.5 text-[10px] font-black text-white shadow-lg">
                {activeInbox.unreadCount > 9 ? "9+" : activeInbox.unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/5 bg-[#0f0f0f]/95 text-white backdrop-blur-xl">
          {NAV.map(n => (
            <button key={n.id} type="button" onClick={() => setTab(n.id)} className={"flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all " + (tab === n.id ? "text-[#03A9F4]" : "text-white/55 hover:text-white/75")}>
              <i className={n.icon + " text-lg"} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

