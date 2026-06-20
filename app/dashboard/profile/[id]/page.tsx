"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { LinkType } from "@/lib/domain/types";

export const dynamic = 'force-dynamic';

interface ProfileTheme {
  style: "gradient" | "glassmorphism" | "minimal";
  primaryColor: string;
  fontFamily: string;
}

interface LinkItem {
  id: string;
  type: LinkType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  activeFrom: string | null;
  activeTo: string | null;
}

interface ProfileData {
  id: string;
  publicId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: ProfileTheme;
  passwordProtected: boolean;
  sensitiveContent: boolean;
  isActive: boolean;
  links: LinkItem[];
}

const LINK_TYPES: LinkType[] = ["URL", "VCF", "WHATSAPP", "YOUTUBE", "SPOTIFY", "TIKTOK"];
const THEME_STYLES = ["gradient", "glassmorphism", "minimal"] as const;
const FONT_OPTIONS = ["Inter", "Roboto", "Poppins", "Montserrat", "Playfair Display"];

const LINK_TYPE_META: Record<LinkType, { icon: string; emoji: string; color: string; placeholder: string }> = {
  URL:      { icon: "ri-link",           emoji: "🔗", color: "#03A9F4", placeholder: "https://yourwebsite.com" },
  VCF:      { icon: "ri-contacts-line",  emoji: "👤", color: "#8A2BE2", placeholder: "https://..." },
  WHATSAPP: { icon: "ri-whatsapp-line",  emoji: "💬", color: "#25D366", placeholder: "https://wa.me/1234567890" },
  YOUTUBE:  { icon: "ri-youtube-line",   emoji: "▶️", color: "#FF0000", placeholder: "https://youtube.com/@channel" },
  SPOTIFY:  { icon: "ri-spotify-line",   emoji: "🎵", color: "#1DB954", placeholder: "https://open.spotify.com/..." },
  TIKTOK:   { icon: "ri-tiktok-line",    emoji: "🎬", color: "#010101", placeholder: "https://tiktok.com/@username" },
};

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, type: "success" | "error" = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

export default function ProfileBuilderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast, show: showToast } = useToast();
  const orderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setAuthToken(session.access_token);
      setUserId(session.user.id);
      loadProfile(session.user.id, session.access_token);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, profileId]);

  async function loadProfile(uid: string, token: string) {
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${token}`, "x-user-id": uid },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const json = await res.json();
      setProfile(json.data);
    } catch {
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      "x-user-id": userId ?? "",
    };
  }

  async function saveProfile(patch: Partial<ProfileData>) {
    if (!profile) return;
    const previous = profile;
    setProfile({ ...profile, ...patch });
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Save failed");
      }
      const json = await res.json();
      setProfile(json.data);
      showToast("Saved", "success");
    } catch (e: unknown) {
      setProfile(previous);
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function moveLink(index: number, direction: "up" | "down") {
    if (!profile) return;
    const links = [...profile.links];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= links.length) return;
    [links[index], links[swapIndex]] = [links[swapIndex], links[index]];
    const reordered = links.map((l, i) => ({ ...l, displayOrder: i }));
    setProfile({ ...profile, links: reordered });
    if (orderDebounceRef.current) clearTimeout(orderDebounceRef.current);
    orderDebounceRef.current = setTimeout(() => persistOrder(reordered), 2000);
  }

  async function persistOrder(links: LinkItem[]) {
    try {
      await fetch(`/api/v1/profiles/${profileId}/links/order`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ order: links.map((l) => l.id) }),
      });
    } catch {
      showToast("Failed to save link order", "error");
    }
  }

  async function addLink(data: { type: LinkType; title: string; url: string }) {
    if (!profile) return;
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}/links`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to add link");
      }
      const json = await res.json();
      setProfile({ ...profile, links: [...profile.links, json.data] });
      showToast("Link added", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to add link", "error");
    }
  }

  async function updateLink(linkId: string, patch: Partial<LinkItem>) {
    if (!profile) return;
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}/links/${linkId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to update link");
      }
      const json = await res.json();
      setProfile({ ...profile, links: profile.links.map((l) => (l.id === linkId ? json.data : l)) });
      showToast("Link updated", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update link", "error");
    }
  }

  async function deleteLink(linkId: string) {
    if (!profile) return;
    try {
      const res = await fetch(`/api/v1/profiles/${profileId}/links/${linkId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete link");
      setProfile({ ...profile, links: profile.links.filter((l) => l.id !== linkId) });
      showToast("Link deleted", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to delete link", "error");
    }
  }

  if (loading) {
    return (
      <div className="bg-[#0b0a0a] min-h-screen text-white flex items-center justify-center">
        <span className="text-white/40">Loading profile…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#0b0a0a] min-h-screen text-white flex items-center justify-center">
        <span className="text-red-400">Profile not found.</span>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0a0a] min-h-screen text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === "success"
            ? "bg-green-500/20 border border-green-500/40 text-green-300"
            : "bg-red-500/20 border border-red-500/40 text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 bg-[#0b0a0a]/90 backdrop-blur-md z-10">
        <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium truncate">{profile.displayName}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showPreview
                ? "border-[#03A9F4]/40 bg-[#03A9F4]/10 text-[#03A9F4]"
                : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
            }`}
          >
            <i className={`${showPreview ? "ri-eye-off-line" : "ri-eye-line"} mr-1`} />
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <a
            href={`/profile/${profile.publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white transition-colors border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg"
          >
            View Live ↗
          </a>
        </div>
      </nav>

      <div className={`flex gap-6 max-w-6xl mx-auto px-6 py-10 ${showPreview ? "lg:flex-row" : ""}`}>
        {/* Editor */}
        <div className={`space-y-6 ${showPreview ? "lg:w-1/2 w-full" : "w-full max-w-3xl mx-auto"}`}>
          <ProfileInfoSection profile={profile} saving={saving} onSave={saveProfile} />
          <ThemeSection theme={profile.theme} saving={saving} onSave={(theme) => saveProfile({ theme })} />
          <TogglesSection
            passwordProtected={profile.passwordProtected}
            sensitiveContent={profile.sensitiveContent}
            saving={saving}
            onSave={saveProfile}
          />
          <LinksSection
            links={profile.links}
            onMove={moveLink}
            onAdd={addLink}
            onUpdate={updateLink}
            onDelete={deleteLink}
          />
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="hidden lg:block lg:w-1/2 sticky top-24 self-start">
            <ProfilePreview profile={profile} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function ProfilePreview({ profile }: { profile: ProfileData }) {
  const { primaryColor, fontFamily, style } = profile.theme;

  const wrapperBg =
    style === "gradient"
      ? "bg-gradient-to-br from-[#0b0a0a] via-[#0f0f1a] to-[#0b0a0a]"
      : "bg-[#0b0a0a]";

  const cardBg =
    style === "glassmorphism"
      ? "bg-white/5 backdrop-blur-xl border border-white/10"
      : style === "gradient"
      ? "bg-white/5 border border-white/10"
      : "bg-[#0f0f0f] border border-[#1e1e1e]";

  const linkBg =
    style === "minimal"
      ? "bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a]"
      : "bg-white/5 border border-white/10 hover:bg-white/10";

  const now = new Date();
  const activeLinks = profile.links.filter(
    (l) =>
      (!l.activeFrom || new Date(l.activeFrom) <= now) &&
      (!l.activeTo || new Date(l.activeTo) > now)
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: 600 }}>
      <div className="text-xs text-white/30 text-center py-2 bg-white/5 border-b border-white/10 flex items-center justify-center gap-2">
        <i className="ri-smartphone-line" />
        Live Preview
      </div>
      <div className={`${wrapperBg} h-full overflow-y-auto`} style={{ fontFamily: `${fontFamily}, Inter, sans-serif` }}>
        <div
          className="fixed top-0 left-0 right-0 h-48 rounded-full blur-[80px] opacity-10 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />
        <div className="relative z-10 p-6 flex flex-col gap-4">
          {/* Profile card */}
          <div className={`${cardBg} rounded-2xl p-6 text-center`}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2" style={{ borderColor: `${primaryColor}40` }} />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-white font-bold text-lg">{profile.displayName}</h2>
            {profile.bio && <p className="text-white/50 text-xs mt-1 leading-relaxed">{profile.bio}</p>}
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            {activeLinks.map((link) => {
              const meta = LINK_TYPE_META[link.type];
              return (
                <div key={link.id} className={`${linkBg} rounded-xl px-4 py-3 flex items-center gap-3 transition-all`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
                    <i className={`${meta.icon} text-sm`} style={{ color: meta.color }} />
                  </div>
                  <span className="text-white text-sm font-medium flex-1 truncate">{link.title}</span>
                  <i className="ri-arrow-right-up-line text-white/30 text-xs" />
                </div>
              );
            })}
            {activeLinks.length === 0 && (
              <p className="text-white/20 text-xs text-center py-4">No active links yet</p>
            )}
          </div>

          <div className="text-center pt-2">
            <span className="text-white/20 text-xs">Powered by <span style={{ color: primaryColor }}>NFC ID</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Info Section ──────────────────────────────────────────────────────

function ProfileInfoSection({
  profile,
  saving,
  onSave,
}: {
  profile: ProfileData;
  saving: boolean;
  onSave: (patch: Partial<ProfileData>) => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");

  function copyProfileLink() {
    navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.publicId}`);
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Profile Info</h2>
        <button
          onClick={copyProfileLink}
          className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <i className="ri-link" />
          Copy Link
        </button>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#03A9F4]/30 to-[#8A2BE2]/30 flex items-center justify-center text-xl font-bold border border-white/10">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs text-white/50 mb-1">Avatar URL</p>
          <input
            type="url"
            defaultValue={profile.avatarUrl ?? ""}
            onBlur={(e) => onSave({ avatarUrl: e.target.value || null })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
            placeholder="Short bio…"
          />
          <p className="text-xs text-white/30 text-right">{bio.length}/500</p>
        </div>
      </div>
      <button
        onClick={() => onSave({ displayName, bio: bio || null })}
        disabled={saving}
        className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}

// ── Theme Section ─────────────────────────────────────────────────────────────

function ThemeSection({
  theme,
  saving,
  onSave,
}: {
  theme: ProfileTheme;
  saving: boolean;
  onSave: (theme: ProfileTheme) => void;
}) {
  const [style, setStyle] = useState<ProfileTheme["style"]>(theme.style);
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [fontFamily, setFontFamily] = useState(theme.fontFamily);

  const presetColors = ["#03A9F4", "#8A2BE2", "#FF6B6B", "#00d084", "#FFD700", "#FF69B4", "#FF8C00", "#00CED1"];

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-base">Theme</h2>

      <div>
        <label className="block text-xs text-white/50 mb-2">Style</label>
        <div className="flex gap-2">
          {THEME_STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${
                style === s
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-2">Accent Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {presetColors.map((c) => (
            <button
              key={c}
              onClick={() => setPrimaryColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${primaryColor === c ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer bg-transparent border border-white/20"
            title="Custom color"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Font</label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        >
          {["Inter", "Roboto", "Poppins", "Montserrat", "Playfair Display"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onSave({ style, primaryColor, fontFamily })}
        disabled={saving}
        className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Theme"}
      </button>
    </section>
  );
}

// ── Toggles Section ───────────────────────────────────────────────────────────

function TogglesSection({
  passwordProtected,
  sensitiveContent,
  saving,
  onSave,
}: {
  passwordProtected: boolean;
  sensitiveContent: boolean;
  saving: boolean;
  onSave: (patch: { passwordProtected?: boolean; sensitiveContent?: boolean }) => void;
}) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
      <h2 className="font-semibold text-base">Access Controls</h2>
      <Toggle
        label="Password Protected"
        description="Visitors must enter a PIN to view your profile"
        checked={passwordProtected}
        disabled={saving}
        onChange={(v) => onSave({ passwordProtected: v })}
      />
      <Toggle
        label="Sensitive Content"
        description="Show a content warning before displaying your profile"
        checked={sensitiveContent}
        disabled={saving}
        onChange={(v) => onSave({ sensitiveContent: v })}
      />
    </section>
  );
}

function Toggle({ label, description, checked, disabled, onChange }: {
  label: string; description: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[#03A9F4]" : "bg-white/20"}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform bg-white ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

// ── Links Section ─────────────────────────────────────────────────────────────

function LinksSection({
  links,
  onMove,
  onAdd,
  onUpdate,
  onDelete,
}: {
  links: LinkItem[];
  onMove: (index: number, direction: "up" | "down") => void;
  onAdd: (data: { type: LinkType; title: string; url: string }) => void;
  onUpdate: (linkId: string, patch: Partial<LinkItem>) => void;
  onDelete: (linkId: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Links</h2>
          <p className="text-xs text-white/30 mt-0.5">{links.length} link{links.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          className="text-sm bg-[#03A9F4] text-white font-medium px-3 py-1.5 rounded-lg hover:bg-[#03A9F4]/80 transition-colors flex items-center gap-1.5"
        >
          <i className="ri-add-line" />
          Add Link
        </button>
      </div>

      {showAddForm && (
        <AddLinkForm
          onSubmit={(data) => { onAdd(data); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {links.length === 0 && !showAddForm && (
        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
          <i className="ri-links-line text-3xl text-white/20 mb-2 block" />
          <p className="text-sm text-white/30">No links yet. Add your first link above.</p>
        </div>
      )}

      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={link.id}>
            {editingId === link.id ? (
              <EditLinkForm
                link={link}
                onSubmit={(patch) => { onUpdate(link.id, patch); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <LinkRow
                link={link}
                index={index}
                total={links.length}
                onMoveUp={() => onMove(index, "up")}
                onMoveDown={() => onMove(index, "down")}
                onEdit={() => setEditingId(link.id)}
                onDelete={() => onDelete(link.id)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function LinkRow({ link, index, total, onMoveUp, onMoveDown, onEdit, onDelete }: {
  link: LinkItem; index: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const meta = LINK_TYPE_META[link.type];
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 group hover:border-white/20 transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
        <i className={`${meta.icon} text-sm`} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{link.title}</p>
        <p className="text-xs text-white/40 truncate">{link.url}</p>
      </div>
      <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded hidden sm:block">{link.type}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors" title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors" title="Move down">↓</button>
        <button onClick={onEdit} className="p-1 text-white/40 hover:text-white transition-colors" title="Edit"><i className="ri-pencil-line" /></button>
        <button onClick={onDelete} className="p-1 text-white/40 hover:text-red-400 transition-colors" title="Delete"><i className="ri-delete-bin-line" /></button>
      </div>
    </div>
  );
}

function AddLinkForm({ onSubmit, onCancel }: {
  onSubmit: (data: { type: LinkType; title: string; url: string }) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<LinkType>("URL");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    onSubmit({ type, title: title.trim(), url: url.trim() });
  }

  const meta = LINK_TYPE_META[type];

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/20 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">New Link</p>
      {/* Type selector */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {LINK_TYPES.map((t) => {
          const m = LINK_TYPE_META[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-all ${
                type === t ? "border-white/40 bg-white/10" : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              <i className={`${m.icon} text-base`} style={{ color: type === t ? m.color : undefined }} />
              <span className="text-[10px]">{t}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            placeholder="e.g. My Website"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            placeholder={meta.placeholder}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors">Add</button>
        <button type="button" onClick={onCancel} className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

function EditLinkForm({ link, onSubmit, onCancel }: {
  link: LinkItem;
  onSubmit: (patch: Partial<LinkItem>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<LinkType>(link.type);
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [activeFrom, setActiveFrom] = useState(link.activeFrom?.slice(0, 16) ?? "");
  const [activeTo, setActiveTo] = useState(link.activeTo?.slice(0, 16) ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      type,
      title: title.trim(),
      url: url.trim(),
      activeFrom: activeFrom ? new Date(activeFrom).toISOString() : null,
      activeTo: activeTo ? new Date(activeTo).toISOString() : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/20 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">Edit Link</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as LinkType)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
            {LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">URL</label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Active From</label>
          <input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Active To</label>
          <input type="datetime-local" value={activeTo} onChange={(e) => setActiveTo(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
