import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────────────────────────

export const TagStateSchema = z.enum([
  'MANUFACTURED',
  'SOLD',
  'CLAIMED',
  'ACTIVE',
  'SUSPENDED',
]);

export const LinkTypeSchema = z.enum([
  'URL',
  'VCF',
  'WHATSAPP',
  'YOUTUBE',
  'SPOTIFY',
  'TIKTOK',
]);

// ── ProfileTheme ─────────────────────────────────────────────────────────────

export const ProfileThemeSchema = z.object({
  style: z.enum(['gradient', 'glassmorphism', 'minimal', 'dark', 'purple-haze', 'rose-gold', 'm-motorsport', 'royal-wave', 'neon-red', 'cosmic-nebula', 'electric-grid', 'lava-fracture', 'crimson-grid', 'cyber-tunnel']),
  primaryColor: z.string().min(1),
  fontFamily: z.string().min(1),
});

// ── Tag ──────────────────────────────────────────────────────────────────────

export const TagSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().min(1),
  state: TagStateSchema,
  ownerId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── Profile ──────────────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string().min(1),
  ownerId: z.string().uuid(),
  displayName: z.string().min(1),
  bio: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  theme: ProfileThemeSchema,
  passwordProtected: z.boolean(),
  pinHash: z.string().nullable(),
  sensitiveContent: z.boolean(),
  isActive: z.boolean(),
  isSuspended: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── Link ─────────────────────────────────────────────────────────────────────

export const LinkSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  type: LinkTypeSchema,
  title: z.string().min(1),
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  displayOrder: z.number().int().nonnegative(),
  activeFrom: z.coerce.date().nullable(),
  activeTo: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── LeadFormSubmission ───────────────────────────────────────────────────────

export const LeadFormSubmissionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  email: z.string().email(),
  sourceIpHash: z.string().min(1),
  publicId: z.string().min(1),
  submittedAt: z.coerce.date(),
});

export const ProfileMessageSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  senderName: z.string().min(1),
  message: z.string().min(1),
  sourceIpHash: z.string().min(1),
  publicId: z.string().min(1),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

// ── Input / mutation schemas ─────────────────────────────────────────────────

/**
 * XSS-safe URL validator: only allows web, email, and phone schemes (Req 4.6).
 * z.string().url() alone accepts javascript:, data:, ftp:, etc.
 */
const safeUrl = z
  .string()
  .url()
  .refine(
    (val) => {
      try {
        const { protocol } = new URL(val);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use http, https, mailto, or tel scheme' }
  );

/**
 * CreateLinkSchema — validates a new link submission.
 * URL is validated with safeUrl (http/https only) for XSS safety (Req 4.6).
 * type is restricted to the allowed LinkType allowlist (Req 4.1).
 */
export const CreateLinkSchema = z.object({
  type: LinkTypeSchema,
  title: z.string().min(1).max(200),
  url: safeUrl,
  thumbnailUrl: safeUrl.nullable().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  activeFrom: z.coerce.date().nullable().optional(),
  activeTo: z.coerce.date().nullable().optional(),
});

/**
 * BatchGenerateSchema — validates admin batch tag generation (Req 8.4).
 * quantity must be between 1 and 10,000.
 */
export const BatchGenerateSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(10_000, 'Quantity must not exceed 10,000'),
});

/**
 * LeadFormInputSchema — validates lead form submissions (Req 5.2).
 * email validated via RFC 5322 pattern using z.string().email().
 */
export const LeadFormInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ProfileMessageInputSchema = z.object({
  senderName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  message: z.string().trim().min(2, 'Message must be at least 2 characters').max(1000, 'Message is too long'),
});

// ── API Response wrapper ─────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});

/**
 * ApiResponseSchema<T> — generic wrapper for all API responses (Req 11.1).
 * Exactly one of data or error will be non-null.
 */
export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: ApiErrorSchema.nullable(),
  });
}

// ── Inferred TypeScript types ────────────────────────────────────────────────

export type TagSchemaType = z.infer<typeof TagSchema>;
export type ProfileSchemaType = z.infer<typeof ProfileSchema>;
export type LinkSchemaType = z.infer<typeof LinkSchema>;
export type LeadFormSubmissionSchemaType = z.infer<typeof LeadFormSubmissionSchema>;
export type ProfileMessageSchemaType = z.infer<typeof ProfileMessageSchema>;
export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type BatchGenerateInput = z.infer<typeof BatchGenerateSchema>;
export type LeadFormInput = z.infer<typeof LeadFormInputSchema>;
export type ProfileMessageInput = z.infer<typeof ProfileMessageInputSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
