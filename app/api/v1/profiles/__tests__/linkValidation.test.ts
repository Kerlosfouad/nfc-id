/**
 * Unit tests for link validation — XSS sanitization and LinkType acceptance.
 * Requirements: 4.6
 *
 * CreateLinkSchema uses z.string().url() which only accepts http/https URLs,
 * rejecting javascript:, data:, vbscript:, and other dangerous schemes.
 */

import { describe, it, expect } from 'vitest';
import { CreateLinkSchema } from '../../../../../lib/validators/schemas';

// ── Helpers ───────────────────────────────────────────────────────────────────

function validLink(overrides: Record<string, unknown> = {}) {
  return {
    type: 'URL',
    title: 'My Link',
    url: 'https://example.com',
    ...overrides,
  };
}

function parseUrl(url: string) {
  return CreateLinkSchema.safeParse(validLink({ url }));
}

// ── Malicious URL rejection ───────────────────────────────────────────────────

describe('CreateLinkSchema — XSS URL rejection (Req 4.6)', () => {
  const maliciousUrls = [
    'javascript:alert(1)',
    'javascript:alert("xss")',
    'JAVASCRIPT:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://malicious.example.com',
    '',
    'not-a-url',
    '//example.com',
    'example.com',
  ];

  for (const url of maliciousUrls) {
    it(`rejects malicious/invalid URL: ${url || '(empty string)'}`, () => {
      const result = parseUrl(url);
      expect(result.success).toBe(false);
    });
  }
});

// ── Valid http/https URLs accepted ────────────────────────────────────────────

describe('CreateLinkSchema — valid URLs accepted', () => {
  const validUrls = [
    'https://example.com',
    'http://example.com',
    'https://example.com/path?query=1#hash',
    'https://sub.domain.example.com/path',
    'https://example.com:8080/path',
  ];

  for (const url of validUrls) {
    it(`accepts valid URL: ${url}`, () => {
      const result = parseUrl(url);
      expect(result.success).toBe(true);
    });
  }
});

// ── All valid LinkType values accepted ────────────────────────────────────────

describe('CreateLinkSchema — all valid LinkType values accepted (Req 4.1)', () => {
  const linkTypes = ['URL', 'VCF', 'WHATSAPP', 'YOUTUBE', 'SPOTIFY', 'TIKTOK'] as const;

  for (const type of linkTypes) {
    it(`accepts LinkType: ${type}`, () => {
      const result = CreateLinkSchema.safeParse(validLink({ type }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(type);
      }
    });
  }

  it('rejects unknown LinkType', () => {
    const result = CreateLinkSchema.safeParse(validLink({ type: 'INSTAGRAM' }));
    expect(result.success).toBe(false);
  });
});

// ── Required fields validation ────────────────────────────────────────────────

describe('CreateLinkSchema — required field validation', () => {
  it('rejects missing type', () => {
    const { type: _type, ...noType } = validLink();
    const result = CreateLinkSchema.safeParse(noType);
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title: _title, ...noTitle } = validLink();
    const result = CreateLinkSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = CreateLinkSchema.safeParse(validLink({ title: '' }));
    expect(result.success).toBe(false);
  });

  it('rejects missing url', () => {
    const { url: _url, ...noUrl } = validLink();
    const result = CreateLinkSchema.safeParse(noUrl);
    expect(result.success).toBe(false);
  });
});

// ── Optional fields ───────────────────────────────────────────────────────────

describe('CreateLinkSchema — optional fields', () => {
  it('accepts link without optional fields', () => {
    const result = CreateLinkSchema.safeParse(validLink());
    expect(result.success).toBe(true);
  });

  it('accepts valid thumbnailUrl', () => {
    const result = CreateLinkSchema.safeParse(
      validLink({ thumbnailUrl: 'https://cdn.example.com/thumb.jpg' })
    );
    expect(result.success).toBe(true);
  });

  it('rejects invalid thumbnailUrl', () => {
    const result = CreateLinkSchema.safeParse(
      validLink({ thumbnailUrl: 'not-a-url' })
    );
    expect(result.success).toBe(false);
  });

  it('accepts null thumbnailUrl', () => {
    const result = CreateLinkSchema.safeParse(validLink({ thumbnailUrl: null }));
    expect(result.success).toBe(true);
  });

  it('accepts activeFrom and activeTo as ISO date strings', () => {
    const result = CreateLinkSchema.safeParse(
      validLink({
        activeFrom: '2025-01-01T00:00:00.000Z',
        activeTo: '2025-12-31T23:59:59.999Z',
      })
    );
    expect(result.success).toBe(true);
  });

  it('accepts displayOrder as non-negative integer', () => {
    const result = CreateLinkSchema.safeParse(validLink({ displayOrder: 0 }));
    expect(result.success).toBe(true);
  });

  it('rejects negative displayOrder', () => {
    const result = CreateLinkSchema.safeParse(validLink({ displayOrder: -1 }));
    expect(result.success).toBe(false);
  });
});
