export type TagState = 'MANUFACTURED' | 'SOLD' | 'CLAIMED' | 'ACTIVE' | 'SUSPENDED';

export type LinkType = 'URL' | 'VCF' | 'WHATSAPP' | 'YOUTUBE' | 'SPOTIFY' | 'TIKTOK';

export interface ProfileTheme {
  style: 'gradient' | 'glassmorphism' | 'minimal' | 'dark' | 'purple-haze' | 'rose-gold' | 'm-motorsport' | 'royal-wave' | 'black-surf' | 'neon-red' | 'cosmic-nebula' | 'electric-grid' | 'aqua-pulse' | 'crimson-grid' | 'bougainvillea-coast' | 'butterfly-dawn' | 'sakura-sunset';
  primaryColor: string;
  fontFamily: string;
  linksLayout?: 'list' | 'grid';
  profileLayout?: 'classic' | 'hero';
  coverUrl?: string | null;
}

export interface Tag {
  id: string;
  publicId: string;
  state: TagState;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  publicId: string;
  ownerId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: ProfileTheme;
  passwordProtected: boolean;
  pinHash: string | null;
  sensitiveContent: boolean;
  isActive: boolean;
  isSuspended: boolean;
  isVerified: boolean;
  primeDesignUntil: Date | null;
  verifiedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Link {
  id: string;
  profileId: string;
  type: LinkType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  activeFrom: Date | null;
  activeTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFormSubmission {
  id: string;
  profileId: string;
  email: string;
  sourceIpHash: string;
  publicId: string;
  submittedAt: Date;
}

export interface ProfileMessage {
  id: string;
  profileId: string;
  senderName: string;
  message: string;
  sourceIpHash: string;
  publicId: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface AnalyticsEvent {
  id: string;
  profileId: string;
  publicId: string;
  eventType: 'VIEW' | 'CLICK';
  linkId: string | null;
  ipHash: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  referralSource: 'NFC' | 'DIRECT' | 'SOCIAL';
  geoCountry: string | null;
  geoSubdivision: string | null;
  createdAt: Date;
}

export interface TagAuditLog {
  id: string;
  tagId: string;
  previousState: TagState;
  newState: TagState;
  adminId: string;
  createdAt: Date;
}

export interface ModerationTicket {
  id: string;
  profileId: string;
  reporterIpHash: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
}
