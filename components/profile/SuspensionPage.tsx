/**
 * SuspensionPage
 *
 * Shown when a profile is suspended or does not exist.
 * Requirements: 3.1, 9.3, 10.2
 */

import Link from 'next/link';

export default function SuspensionPage() {
  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <i className="ri-forbid-2-line text-red-400 text-4xl" />
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold mb-3">Profile Unavailable</h1>
        <p className="text-[#555] text-sm leading-relaxed mb-8">
          This profile has been suspended and is no longer accessible. If you believe
          this is a mistake, please contact support.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-[#888] text-sm font-medium hover:text-white hover:border-[#03A9F4]/40 transition-all"
        >
          <i className="ri-home-line" />
          Go Home
        </Link>
      </div>
    </main>
  );
}
