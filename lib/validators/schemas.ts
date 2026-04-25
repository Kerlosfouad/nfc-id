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
  style: z.enum(['gradient', 'glassmorphism', 'minimal']),
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

// ── Input / mutation schemas ─────────────────────────────────────────────────

/**
 * XSS-safe URL validator: only allows http and https schemes (Req 4.6).
 * z.string().url() alone accepts javascript:, data:, ftp:, etc.
 */
const safeUrl = z
  .string()
  .url()
  .refine(
    (val) => {
      try {
        const { protocol } = new URL(val);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use http or https scheme' }
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
export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type BatchGenerateInput = z.infer<typeof BatchGenerateSchema>;
export type LeadFormInput = z.infer<typeof LeadFormInputSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
