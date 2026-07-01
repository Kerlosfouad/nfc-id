'use client';

/**
 * PinGate
 *
 * Client component that renders a PIN entry form for password-protected profiles.
 * Calls POST /api/v1/profiles/:id/verify-pin on submission.
 *
 * Requirements: 3.5
 */

import { useState, useRef } from 'react';

interface PinGateProps {
  publicId: string;
}

export default function PinGate({ publicId }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/v1/profiles/${publicId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Reload the page — the server will now serve the full profile
        window.location.reload();
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMsg(body?.error?.message ?? 'Incorrect PIN. Please try again.');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection and try again.');
    }
  }

  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#8A2BE2]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#8A2BE2]/10 border border-[#8A2BE2]/20 flex items-center justify-center">
            <i className="ri-lock-password-line text-[#8A2BE2] text-3xl" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-8 shadow-[0_8px_24px_rgba(0,0,0,0.42)]">
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-bold mb-2">Protected Profile</h2>
            <p className="text-white/65 text-sm">Enter the PIN to view this profile.</p>
          </div>

          {/* Error message */}
          {status === 'error' && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-center text-xl tracking-[0.5em] placeholder:text-white/50 placeholder:tracking-normal focus:outline-none focus:border-[#8A2BE2]/60 transition-colors"
            />

            <button
              type="submit"
              disabled={status === 'loading' || !pin.trim()}
              className="w-full py-3 rounded-xl bg-[#8A2BE2] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#8A2BE2]/80 hover:shadow-[0_0_25px_rgba(138,43,226,0.35)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <i className="ri-arrow-right-line" />
                  Unlock Profile
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
