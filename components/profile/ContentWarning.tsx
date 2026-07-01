'use client';

/**
 * ContentWarning
 *
 * Shown when a profile has the `sensitiveContent` flag set.
 * The visitor must acknowledge the warning before the profile is revealed.
 * On acknowledgement, reloads the page with a query param that the server
 * can use to bypass the warning (or the client handles it locally).
 *
 * Requirements: 3.6
 */

import { useState } from 'react';
import type { Profile } from '@/lib/domain/types';

interface ContentWarningProps {
  profile: Pick<Profile, 'displayName'>;
}

export default function ContentWarning({ profile }: ContentWarningProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (acknowledged) {
    // Reload so the server component re-renders without the warning
    // (In a real implementation, a cookie/session flag would bypass the check)
    window.location.href = window.location.href + '?ack=1';
    return null;
  }

  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <i className="ri-alert-line text-yellow-400 text-3xl" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.42)]">
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-bold mb-2">Sensitive Content</h2>
            <p className="text-white/65 text-sm leading-relaxed">
              <span className="text-white/80 font-medium">{profile.displayName}</span>
              &apos;s profile may contain content that some viewers find sensitive.
              You must be 18 or older to proceed.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setAcknowledged(true)}
              className="w-full py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-bold text-sm uppercase tracking-wider hover:bg-yellow-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i className="ri-check-line" />
              I understand, continue
            </button>

            <button
              onClick={() => window.history.back()}
              className="w-full py-3 rounded-xl bg-transparent border border-[#1e1e1e] text-white/65 font-bold text-sm uppercase tracking-wider hover:border-[#2a2a2a] hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
            >
              <i className="ri-arrow-left-line" />
              Go back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
