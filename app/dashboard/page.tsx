"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LinkItem { id: string; type: string; title: string; url: string; displayOrder: number; activeFrom: string|null; activeTo: string|null; thumbnailUrl: string|null; }
interface ProfileTheme { style: string; primaryColor: string; fontFamily: string; linksLayout?: "list"|"grid"; profileLayout?: "classic"|"hero"; }
interface ProfileData { id: string; publicId: string; displayName: string; bio: string|null; avatarUrl: string|null; theme: ProfileTheme; passwordProtected: boolean; sensitiveContent: boolean; isActive: boolean; isSuspended: boolean; links: LinkItem[]; }

const LMETA: Record<string,{icon:string;color:string}> = {
  URL:{icon:"ri-link",color:"#03A9F4"}, VCF:{icon:"ri-contacts-line",color:"#8A2BE2"},
  WHATSAPP:{icon:"ri-whatsapp-line",color:"#25D366"}, YOUTUBE:{icon:"ri-youtube-line",color:"#FF0000"},
  SPOTIFY:{icon:"ri-spotify-line",color:"#1DB954"}, TIKTOK:{icon:"ri-tiktok-line",color:"#888"},
};
const LTYPES = ["URL","VCF","WHATSAPP","YOUTUBE","SPOTIFY","TIKTOK"];
const COLORS = ["#03A9F4","#8A2BE2","#ec4899","#f59e0b","#10b981","#ef4444","#6366f1","#14b8a6"];
const FONTS  = ["Inter","Poppins","Roboto","Montserrat","Playfair Display"];
type Tab = "home"|"analytics"|"share"|"design"|"settings";

const PRESET_THEMES = [
  { id:"default", name:"Default", desc:"Clean and minimal design", colors:["#ffffff","#f3f4f6","#e5e7eb","#374151"], premium:false },
  { id:"dark", name:"Dark Mode", desc:"Sleek dark interface", colors:["#111827","#1f2937","#3b82f6","#f9fafb"], premium:false },
  { id:"nature", name:"Nature", desc:"Earthy tones and natural feel", colors:["#d1fae5","#6ee7b7","#10b981","#064e3b"], premium:false },
  { id:"ocean", name:"Ocean", desc:"Calming blue tones", colors:["#eff6ff","#bfdbfe","#3b82f6","#1e3a8a"], premium:false },
  { id:"sunset", name:"Sunset", desc:"Warm sunset colors", colors:["#fff7ed","#fed7aa","#f97316","#7c2d12"], premium:true },
  { id:"neon", name:"Neon", desc:"Vibrant neon colors", colors:["#0f0f0f","#1a1a2e","#7c3aed","#a78bfa"], premium:true },
];
function EditProfilePanel({profile,saving,onSave,onClose}:{profile:ProfileData;saving:boolean;onSave:(p:Record<string,unknown>)=>void;onClose:()=>void}){
  const [name,setName]=useState(profile.displayName);
  const [bio,setBio]=useState(profile.bio??"");
  const [avatar,setAvatar]=useState(profile.avatarUrl??"");
  return(
    <div className="bg-[#1a1a1a] border border-[#03A9F4]/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">Edit Profile</h3><button onClick={onClose} className="text-white/40 hover:text-white"><i className="ri-close-line"/></button></div>
      <div><label className="text-xs text-white/40 block mb-1">Display Name</label><input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"/></div>
      <div><label className="text-xs text-white/40 block mb-1">Bio</label><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none"/></div>
      <div><label className="text-xs text-white/40 block mb-1">Avatar URL</label><input value={avatar} onChange={e=>setAvatar(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="https://..."/></div>
      <button onClick={()=>onSave({displayName:name,bio:bio||null,avatarUrl:avatar||null})} disabled={saving} className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{saving?"Saving...":"Save"}</button>
    </div>
  );
}

function AddLinkForm({saving,onSubmit,onCancel}:{saving:boolean;onSubmit:(d:{type:string;title:string;url:string})=>void;onCancel:()=>void}){
  const [type,setType]=useState("URL");
  const [title,setTitle]=useState("");
  const [url,setUrl]=useState("");
  return(
    <div className="bg-white/5 border border-white/20 rounded-xl p-4 space-y-3 mb-3">
      <p className="text-sm font-medium">New Link</p>
      <div className="grid grid-cols-3 gap-2">
        {LTYPES.map(t=>{const m=LMETA[t];return(<button key={t} type="button" onClick={()=>setType(t)} className={"flex flex-col items-center gap-1 py-2 rounded-lg border text-xs "+(type===t?"border-white/40 bg-white/10":"border-white/10 text-white/40")}><i className={m.icon+" text-base"} style={{color:type===t?m.color:undefined}}/><span className="text-[10px]">{t}</span></button>);})}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-white/40 block mb-1">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="My Link"/></div>
        <div><label className="text-xs text-white/40 block mb-1">URL</label><input value={url} onChange={e=>setUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="https://..."/></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>{if(title&&url)onSubmit({type,title,url});}} disabled={saving||!title||!url} className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{saving?"Adding...":"Add"}</button>
        <button onClick={onCancel} className="text-sm text-white/40 px-4 py-2">Cancel</button>
      </div>
    </div>
  );
}

function EditLinkForm({link,saving,onSubmit,onCancel}:{link:LinkItem;saving:boolean;onSubmit:(p:Record<string,unknown>)=>void;onCancel:()=>void}){
  const [title,setTitle]=useState(link.title);
  const [url,setUrl]=useState(link.url);
  return(
    <div className="bg-white/5 border border-white/20 rounded-xl p-4 space-y-3 mb-3">
      <p className="text-sm font-medium">Edit Link</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-white/40 block mb-1">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"/></div>
        <div><label className="text-xs text-white/40 block mb-1">URL</label><input value={url} onChange={e=>setUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"/></div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>onSubmit({title,url})} disabled={saving} className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">{saving?"Saving...":"Save"}</button>
        <button onClick={onCancel} className="text-sm text-white/40 px-4 py-2">Cancel</button>
      </div>
    </div>
  );
}

function HomeTab({profile,saving,onPatch,onAddLink,onEditLink,onDeleteLink,onMove,editOpen,setEditOpen,addOpen,setAddOpen,editLink,setEditLink,onUpdateLink,onAddLinkSubmit}:{
  profile:ProfileData;saving:boolean;onPatch:(p:Record<string,unknown>)=>void;onAddLink:()=>void;onEditLink:(l:LinkItem)=>void;onDeleteLink:(id:string)=>void;onMove:(i:number,d:"up"|"down")=>void;
  editOpen:boolean;setEditOpen:(v:boolean)=>void;addOpen:boolean;setAddOpen:(v:boolean)=>void;editLink:LinkItem|null;setEditLink:(l:LinkItem|null)=>void;
  onUpdateLink:(id:string,p:Record<string,unknown>)=>void;onAddLinkSubmit:(d:{type:string;title:string;url:string})=>void;
}){
  return(
    <div className="flex gap-5">
      <div className="flex-1 space-y-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="relative h-44 bg-gradient-to-br from-[#03A9F4]/20 via-[#8A2BE2]/10 to-[#111] flex items-center justify-center">
            <i className="ri-image-line text-white/10 text-5xl"/>
            <div className="absolute bottom-0 left-5 translate-y-1/2">
              {profile.avatarUrl
                ?<img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full border-4 border-[#1a1a1a] object-cover"/>
                :<div className="w-16 h-16 rounded-full border-4 border-[#1a1a1a] bg-gradient-to-br from-[#03A9F4]/40 to-[#8A2BE2]/40 flex items-center justify-center text-xl font-bold">{profile.displayName.charAt(0).toUpperCase()}</div>
              }
            </div>
          </div>
          <div className="pt-10 pb-5 px-5">
            <h2 className="text-white font-bold text-lg">{profile.displayName}</h2>
            {profile.bio&&<p className="text-white/40 text-sm mt-0.5">{profile.bio}</p>}
            <p className="text-[#03A9F4] text-xs font-mono mt-1">/profile/{profile.publicId}</p>
          </div>
        </div>
        {editOpen&&<EditProfilePanel profile={profile} saving={saving} onSave={(p)=>{onPatch(p);setEditOpen(false);}} onClose={()=>setEditOpen(false)}/>}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Your Links</h3>
            <button onClick={onAddLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#03A9F4] text-white text-xs font-semibold hover:bg-[#03A9F4]/80"><i className="ri-add-line"/>Add Link</button>
          </div>
          {addOpen&&<AddLinkForm saving={saving} onSubmit={onAddLinkSubmit} onCancel={()=>setAddOpen(false)}/>}
          {editLink&&<EditLinkForm link={editLink} saving={saving} onSubmit={(p)=>onUpdateLink(editLink.id,p)} onCancel={()=>setEditLink(null)}/>}
          {profile.links.length===0&&!addOpen
            ?<div className="text-center py-8 border border-dashed border-white/10 rounded-xl"><i className="ri-links-line text-3xl text-white/20 mb-2 block"/><p className="text-white/30 text-sm">No links yet</p></div>
            :<div className="space-y-2">{profile.links.map((link,i)=>{const m=LMETA[link.type]??{icon:"ri-link",color:"#03A9F4"};return(
              <div key={link.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 group hover:border-white/20">
                <i className="ri-drag-move-2-line text-white/20 text-sm"/>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:m.color+"20"}}><i className={m.icon+" text-sm"} style={{color:m.color}}/></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{link.title}</p><p className="text-xs text-white/30 truncate">{link.url}</p></div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={()=>onMove(i,"up")} disabled={i===0} className="p-1 text-white/40 hover:text-white disabled:opacity-20">↑</button>
                  <button onClick={()=>onMove(i,"down")} disabled={i===profile.links.length-1} className="p-1 text-white/40 hover:text-white disabled:opacity-20">↓</button>
                  <button onClick={()=>onEditLink(link)} className="p-1 text-white/40 hover:text-white"><i className="ri-pencil-line text-sm"/></button>
                  <button onClick={()=>onDeleteLink(link.id)} className="p-1 text-white/40 hover:text-red-400"><i className="ri-delete-bin-line text-sm"/></button>
                </div>
              </div>
            );})}
            </div>
          }
        </div>
      </div>
      <div className="w-52 flex-shrink-0 space-y-3">
        <a href={"/profile/"+profile.publicId} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 hover:bg-white/5 hover:border-white/20 group">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10"><i className="ri-eye-line text-white/60 group-hover:text-white"/></div>
          <div><p className="text-sm font-semibold">Preview</p><p className="text-xs text-white/40">View Profile</p></div>
        </a>
        <button onClick={()=>setEditOpen(!editOpen)} className="w-full flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 hover:bg-white/5 hover:border-white/20 group text-left">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10"><i className="ri-pencil-line text-white/60 group-hover:text-white"/></div>
          <div><p className="text-sm font-semibold">Edit Profile</p><p className="text-xs text-white/40">Name, bio, avatar</p></div>
        </button>
        <div className={"flex items-center gap-3 bg-[#1a1a1a] border rounded-xl px-4 py-3.5 "+(profile.isActive&&!profile.isSuspended?"border-green-500/20 bg-green-500/5":"border-white/10")}>
          <div className={"w-9 h-9 rounded-xl flex items-center justify-center "+(profile.isActive&&!profile.isSuspended?"bg-green-500/10":"bg-white/5")}><i className={"ri-shield-check-line "+(profile.isActive&&!profile.isSuspended?"text-green-400":"text-white/40")}/></div>
          <div><p className="text-sm font-semibold">{profile.isSuspended?"Suspended":profile.isActive?"Active":"Inactive"}</p><p className="text-xs text-white/40">Tag status</p></div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({profile,token,uid}:{profile:ProfileData;token:string;uid:string}){
  const [data,setData]=useState<{totalViews:number;uniqueVisitors:number;totalLinkClicks:number}|null>(null);
  useEffect(()=>{
    fetch("/api/v1/analytics/"+profile.id,{headers:{Authorization:"Bearer "+token,"x-user-id":uid}}).then(r=>r.json()).then(j=>setData(j.data)).catch(()=>{});
  },[profile.id,token,uid]);
  const totalClicks=data?.totalLinkClicks??0;
  return(
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Analytics</h2>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Total Views",value:data?.totalViews??"—",icon:"ri-eye-line",color:"text-white"},{label:"Unique Visitors",value:data?.uniqueVisitors??"—",icon:"ri-user-line",color:"text-[#03A9F4]"},{label:"Total Clicks",value:totalClicks||"—",icon:"ri-cursor-line",color:"text-purple-400"}].map((s,i)=>(
          <div key={i} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><i className={s.icon+" "+s.color+" text-sm"}/><p className="text-xs text-white/40">{s.label}</p></div><p className={"text-3xl font-bold "+s.color}>{String(s.value)}</p></div>
        ))}
      </div>
      {!data&&<div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 text-center"><p className="text-white/30 text-sm">Analytics will appear after your first visitor.</p></div>}
    </div>
  );
}

function ShareTab({profile,onCopy,copied}:{profile:ProfileData;onCopy:()=>void;copied:boolean}){
  const url=typeof window!=="undefined"?window.location.origin+"/profile/"+profile.publicId:"/profile/"+profile.publicId;
  return(
    <div className="space-y-4 max-w-lg">
      <h2 className="font-bold text-lg">Share Your Profile</h2>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3"><span className="text-[#03A9F4] text-sm font-mono flex-1 truncate">{url}</span><button onClick={onCopy} className="text-white/40 hover:text-white text-xs flex items-center gap-1"><i className={copied?"ri-check-line text-green-400":"ri-file-copy-line"}/>{copied?"Copied!":"Copy"}</button></div>
        <div className="grid grid-cols-2 gap-3">
          <a href={"https://wa.me/?text="+encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm hover:bg-[#25D366]/20"><i className="ri-whatsapp-line text-lg"/>WhatsApp</a>
          <a href={"https://twitter.com/intent/tweet?url="+encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10"><i className="ri-twitter-x-line text-lg"/>Twitter / X</a>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({profile}:{profile:ProfileData}){
  return(
    <div className="space-y-4 max-w-lg">
      <h2 className="font-bold text-lg">Settings</h2>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl divide-y divide-white/5">
        {[{icon:"ri-download-line",label:"Export Leads CSV",desc:"Download lead submissions",href:"/api/v1/profiles/"+profile.id+"/leads/export"},{icon:"ri-shield-line",label:"Admin Panel",desc:"Manage tags & moderation",href:"/admin"}].map((item,i)=>(
          <Link key={i} href={item.href} className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 group">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10"><i className={item.icon+" text-white/50 group-hover:text-white"}/></div>
            <div className="flex-1"><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-white/40">{item.desc}</p></div>
            <i className="ri-arrow-right-s-line text-white/20 group-hover:text-white/50"/>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesignTab({profile,saving,onSave}:{profile:ProfileData;saving:boolean;onSave:(t:ProfileTheme)=>void}){
  const [style,setStyle]=useState(profile.theme.style||"default");
  const [linksLayout,setLinksLayout]=useState<"list"|"grid">((profile.theme.linksLayout)||"list");
  const [profileLayout,setProfileLayout]=useState<"classic"|"hero">((profile.theme.profileLayout)||"classic");
  const [subTab,setSubTab]=useState("themes");
  const [refreshKey,setRefreshKey]=useState(0);

  function apply(s:string,ll:"list"|"grid",pl:"classic"|"hero"){
    setStyle(s);setLinksLayout(ll);setProfileLayout(pl);
    onSave({style:s as any,primaryColor:profile.theme.primaryColor,fontFamily:profile.theme.fontFamily,linksLayout:ll,profileLayout:pl});
    setTimeout(()=>setRefreshKey(k=>k+1),500);
  }

  return(
    <div className="flex h-[calc(100vh-60px)] min-h-[600px] w-full overflow-hidden">
      {/* Left sub-nav */}
      <div className="w-44 flex-shrink-0 space-y-1 pr-2 pt-1">
        {[{id:"themes",icon:"ri-brush-line",label:"Themes"},{id:"frames",icon:"ri-focus-2-line",label:"Frames"},{id:"icons",icon:"ri-function-line",label:"Icons"}].map(n=>(
          <button key={n.id} onClick={()=>setSubTab(n.id)} className={"w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors "+(subTab===n.id?"bg-white/10 text-white":"text-white/40 hover:bg-white/5 hover:text-white/80")}>
            <i className={n.icon}/>{n.label}
          </button>
        ))}
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-20">
        {/* Pro banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-yellow-900/40 to-yellow-600/10 border border-yellow-500/20 rounded-2xl px-5 py-3.5">
          <div className="flex items-center gap-3"><i className="ri-vip-crown-fill text-yellow-500 text-lg"/><span className="text-yellow-500/90 font-semibold text-sm">Upgrade to Pro Plus to access all premium themes</span></div>
          <button className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Upgrade Now</button>
        </div>

        {/* Links Layout */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-sm">Links Layout</h3>
            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-md flex items-center gap-1"><i className="ri-vip-crown-fill"/> Pro</span>
          </div>
          <p className="text-xs text-white/40 -mt-1">Choose how your links are displayed on your profile page</p>
          <div className="flex gap-3">
            <button onClick={()=>apply(style,"list",profileLayout)} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors "+(linksLayout==="list"?"bg-white text-black border-white":"bg-[#1a1a1a] text-white/60 border-white/10 hover:border-white/20")}><i className="ri-list-check"/> List</button>
            <button onClick={()=>apply(style,"grid",profileLayout)} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors "+(linksLayout==="grid"?"bg-white text-black border-white":"bg-[#1a1a1a] text-white/60 border-white/10 hover:border-white/20")}><i className="ri-grid-fill"/> Grid</button>
          </div>
        </div>

        {/* Profile Layout */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-sm">Profile Layout</h3>
            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-md flex items-center gap-1"><i className="ri-vip-crown-fill"/> Pro+</span>
          </div>
          <p className="text-xs text-white/40 -mt-1">Display a larger cover image with gradient overlay</p>
          <div className="flex gap-3">
            <button onClick={()=>apply(style,linksLayout,"classic")} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors "+(profileLayout==="classic"?"bg-white/20 text-white border-white/30":"bg-[#1a1a1a] text-white/40 border-white/10 hover:border-white/20")}><i className="ri-user-line"/> Classic</button>
            <button onClick={()=>apply(style,linksLayout,"hero")} className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors "+(profileLayout==="hero"?"bg-white/20 text-white border-white/30":"bg-[#1a1a1a] text-white/40 border-white/10 hover:border-white/20")}><i className="ri-image-line"/> Hero</button>
          </div>
        </div>

        {/* Themes grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Themes</h3>
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-white/5">
              <button className="px-3 py-1 bg-white/10 text-white text-xs font-semibold rounded-md">All</button>
              <button className="px-3 py-1 text-white/40 text-xs font-semibold hover:text-white transition-colors">Free</button>
              <button className="px-3 py-1 text-white/40 text-xs font-semibold hover:text-white transition-colors">Premium</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PRESET_THEMES.map(t=>(
              <div key={t.id} onClick={()=>apply(t.id,linksLayout,profileLayout)} className={"cursor-pointer bg-[#141414] border rounded-2xl p-4 transition-all "+(style===t.id?"border-white ring-2 ring-white/20":"border-white/10 hover:border-white/30")}>
                <div className="flex items-start justify-between mb-3">
                  <div><h4 className="text-sm font-bold text-white">{t.name}</h4><p className="text-[10px] text-white/40 mt-0.5">{t.desc}</p></div>
                  {t.premium&&<span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded flex items-center gap-1"><i className="ri-vip-crown-fill"/> Premium</span>}
                </div>
                <div className="w-full h-28 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2" style={{backgroundColor:t.colors[0]}}>
                  <div className="w-8 h-8 rounded-full" style={{backgroundColor:t.colors[1]}}/>
                  <div className="w-16 h-2 rounded-full" style={{backgroundColor:t.colors[2]}}/>
                  <div className="w-12 h-2 rounded-full" style={{backgroundColor:t.colors[3]}}/>
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {t.colors.map((col,i)=><div key={i} className="w-4 h-4 rounded-full border border-black/10" style={{backgroundColor:col}}/>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right phone preview */}
      <div className="w-[260px] flex-shrink-0 flex justify-center items-start pt-2 sticky top-0">
        <div className="w-[240px] h-[500px] border-[8px] border-white/10 rounded-[3rem] overflow-hidden relative shadow-2xl bg-[#111]">
          <div className="absolute top-0 inset-x-0 flex justify-center z-50 pt-1">
            <div className="w-24 h-5 bg-black rounded-b-2xl"/>
          </div>
          <div className="w-[375px] h-[812px] origin-top-left" style={{transform:"scale(0.597)"}}>
            <iframe
              key={refreshKey}
              src={"/profile/"+profile.publicId+"?preview=true&style="+style+"&linksLayout="+linksLayout+"&profileLayout="+profileLayout}
              className="w-full h-full border-none pointer-events-none"
              title="Profile Preview"
            />
          </div>
          {saving&&(
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <i className="ri-loader-4-line text-white text-3xl animate-spin mb-2"/>
              <p className="text-white text-xs font-semibold">Updating...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [token,setToken]       = useState("");
  const [uid,setUid]           = useState("");
  const [email,setEmail]       = useState("");
  const [profiles,setProfiles] = useState<ProfileData[]>([]);
  const [selId,setSelId]       = useState<string|null>(null);
  const [tab,setTab]           = useState<Tab>("home");
  const [loading,setLoading]   = useState(true);
  const [toast,setToast]       = useState<{msg:string;ok:boolean}|null>(null);
  const [saving,setSaving]     = useState(false);
  const [editOpen,setEditOpen] = useState(false);
  const [addOpen,setAddOpen]   = useState(false);
  const [editLink,setEditLink] = useState<LinkItem|null>(null);
  const [copied,setCopied]     = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const profile = profiles.find(p=>p.id===selId) ?? profiles[0] ?? null;

  function showToast(msg:string,ok=true){setToast({msg,ok});if(tRef.current)clearTimeout(tRef.current);tRef.current=setTimeout(()=>setToast(null),3000);}
  function hdrs(){return{"Content-Type":"application/json",Authorization:"Bearer "+token,"x-user-id":uid};}

  useEffect(()=>{
    createClient().auth.getSession().then(({data:{session}})=>{
      if(!session){router.push("/login");return;}
      setToken(session.access_token);setUid(session.user.id);setEmail(session.user.email??"");
      fetch("/api/v1/profiles",{headers:{Authorization:"Bearer "+session.access_token,"x-user-id":session.user.id}})
        .then(r=>r.json()).then(j=>setProfiles((j.data??[]).map((p:ProfileData)=>({...p,links:p.links??[]})))).catch(()=>{}).finally(()=>setLoading(false));
    }).catch(()=>router.push("/login"));
  },[router]);

  async function patchProfile(patch:Record<string,unknown>){
    if(!profile)return;setSaving(true);
    try{const r=await fetch("/api/v1/profiles/"+profile.id,{method:"PATCH",headers:hdrs(),body:JSON.stringify(patch)});const j=await r.json();if(!r.ok)throw new Error(j.error?.message??"Failed");setProfiles(prev=>prev.map(p=>p.id===profile.id?{...j.data,links:j.data.links??p.links??[]}:p));showToast("Saved");}
    catch(e:unknown){showToast(e instanceof Error?e.message:"Error",false);}finally{setSaving(false);}
  }
  async function addLink(data:{type:string;title:string;url:string}){
    if(!profile)return;setSaving(true);
    try{const r=await fetch("/api/v1/profiles/"+profile.id+"/links",{method:"POST",headers:hdrs(),body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error?.message??"Failed");setProfiles(prev=>prev.map(p=>p.id===profile.id?{...p,links:[...p.links,j.data]}:p));showToast("Link added");setAddOpen(false);}
    catch(e:unknown){showToast(e instanceof Error?e.message:"Error",false);}finally{setSaving(false);}
  }
  async function updateLink(linkId:string,patch:Record<string,unknown>){
    if(!profile)return;setSaving(true);
    try{const r=await fetch("/api/v1/profiles/"+profile.id+"/links/"+linkId,{method:"PATCH",headers:hdrs(),body:JSON.stringify(patch)});const j=await r.json();if(!r.ok)throw new Error(j.error?.message??"Failed");setProfiles(prev=>prev.map(p=>p.id===profile.id?{...p,links:p.links.map(l=>l.id===linkId?j.data:l)}:p));showToast("Saved");setEditLink(null);}
    catch(e:unknown){showToast(e instanceof Error?e.message:"Error",false);}finally{setSaving(false);}
  }
  async function deleteLink(linkId:string){
    if(!profile)return;
    try{await fetch("/api/v1/profiles/"+profile.id+"/links/"+linkId,{method:"DELETE",headers:hdrs()});setProfiles(prev=>prev.map(p=>p.id===profile.id?{...p,links:p.links.filter(l=>l.id!==linkId)}:p));showToast("Deleted");}
    catch{showToast("Error",false);}
  }
  async function moveLink(index:number,dir:"up"|"down"){
    if(!profile)return;const links=[...profile.links];const swap=dir==="up"?index-1:index+1;if(swap<0||swap>=links.length)return;
    [links[index],links[swap]]=[links[swap],links[index]];const reordered=links.map((l,i)=>({...l,displayOrder:i}));
    setProfiles(prev=>prev.map(p=>p.id===profile.id?{...p,links:reordered}:p));
    await fetch("/api/v1/profiles/"+profile.id+"/links/order",{method:"PUT",headers:hdrs(),body:JSON.stringify({order:reordered.map(l=>l.id)})});
  }
  function copyLink(){if(!profile)return;navigator.clipboard.writeText(window.location.origin+"/profile/"+profile.publicId);setCopied(true);setTimeout(()=>setCopied(false),2000);}

  const NAV:{id:Tab;icon:string;label:string}[]=[
    {id:"home",icon:"ri-home-5-line",label:"Home"},{id:"analytics",icon:"ri-bar-chart-2-line",label:"Analytics"},
    {id:"share",icon:"ri-share-line",label:"Share"},{id:"design",icon:"ri-palette-line",label:"Design"},
    {id:"settings",icon:"ri-settings-3-line",label:"Settings"},
  ];

  if(loading)return(<div className="bg-[#111] min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#03A9F4] border-t-transparent rounded-full animate-spin"/></div>);

  return(
    <div className="flex h-screen bg-[#111] text-white overflow-hidden" style={{fontFamily:"Inter, sans-serif"}}>
      {toast&&<div className={"fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border "+(toast.ok?"bg-green-500/20 border-green-500/40 text-green-300":"bg-red-500/20 border-red-500/40 text-red-300")}>{toast.msg}</div>}
      <aside className="w-[200px] flex-shrink-0 bg-[#0f0f0f] border-r border-white/5 flex flex-col">
        <div className="px-4 py-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/img/logo.png" alt="NFC ID" className="w-7 h-7"/>
            <span className="font-bold text-base">NFC<span className="text-[#03A9F4]">·ID</span></span>
          </Link>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all "+(tab===n.id?"bg-white/10 text-white font-medium":"text-white/40 hover:text-white hover:bg-white/5")}>
              <i className={n.icon+" text-base"}/>{n.label}
            </button>
          ))}
        </nav>
        <div className="px-2 pb-2 border-t border-white/5 pt-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider px-3 mb-1.5">Your Profiles</p>
          {profiles.map(p=>(
            <button key={p.id} onClick={()=>setSelId(p.id)} className={"w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all "+((selId??profiles[0]?.id)===p.id?"bg-white/10 text-white":"text-white/40 hover:text-white hover:bg-white/5")}>
              <div className="w-5 h-5 rounded-full bg-[#03A9F4]/20 flex items-center justify-center text-[10px] font-bold text-[#03A9F4] flex-shrink-0">{p.displayName.charAt(0).toUpperCase()}</div>
              <span className="truncate">{p.displayName}</span>
              {p.isActive&&!p.isSuspended&&<span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"/>}
            </button>
          ))}
        </div>
        <div className="px-3 py-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#03A9F4]/50 to-[#8A2BE2]/50 flex items-center justify-center text-xs font-bold flex-shrink-0">{email.charAt(0).toUpperCase()}</div>
          <p className="text-xs truncate flex-1">{email}</p>
          <button onClick={async()=>{await createClient().auth.signOut();router.push("/login");}} className="text-white/30 hover:text-white"><i className="ri-logout-box-line text-sm"/></button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">
        {!profile?(
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <i className="ri-nfc-line text-5xl text-white/10"/>
            <p className="text-white/50">No profiles yet.</p>
            <Link href="/admin/tags" className="px-5 py-2.5 rounded-full bg-[#03A9F4] text-white text-sm font-semibold hover:bg-[#03A9F4]/80">Generate a Tag</Link>
          </div>
        ):(
          <div className={"h-full "+(tab==="design"?"overflow-hidden px-6 py-6":"overflow-y-auto")}>
            {tab!=="design"&&(
              <div className="max-w-5xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between bg-[#03A9F4]/10 border border-[#03A9F4]/20 rounded-xl px-4 py-2.5 mb-5">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-white/50 text-xs">You are live</span><span className="text-[#03A9F4] text-xs font-mono">/profile/{profile.publicId}</span></div>
                  <button onClick={copyLink} className="text-xs text-white/40 hover:text-white flex items-center gap-1"><i className={copied?"ri-check-line text-green-400":"ri-file-copy-line"}/>{copied?"Copied!":"Copy"}</button>
                </div>
                {tab==="home"&&<HomeTab profile={profile} saving={saving} onPatch={patchProfile} onAddLink={()=>setAddOpen(true)} onEditLink={setEditLink} onDeleteLink={deleteLink} onMove={moveLink} editOpen={editOpen} setEditOpen={setEditOpen} addOpen={addOpen} setAddOpen={setAddOpen} editLink={editLink} setEditLink={setEditLink} onUpdateLink={updateLink} onAddLinkSubmit={addLink}/>}
                {tab==="analytics"&&<AnalyticsTab profile={profile} token={token} uid={uid}/>}
                {tab==="share"&&<ShareTab profile={profile} onCopy={copyLink} copied={copied}/>}
                {tab==="settings"&&<SettingsTab profile={profile}/>}
              </div>
            )}
            {tab==="design"&&<DesignTab profile={profile} saving={saving} onSave={(t)=>patchProfile({theme:t})}/>}
          </div>
        )}
      </main>
    </div>
  );
}
