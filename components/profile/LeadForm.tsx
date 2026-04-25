'use client';

import { useState } from 'react';

interface LeadFormProps {
  profileId: string;
  publicId: string;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function LeadForm({ profileId, publicId }: LeadFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/v1/profiles/${profileId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json?.error?.fields?.email ??
          json?.error?.message ??
          'Something went wrong. Please try again.';
        setErrorMessage(msg);
        setState('error');
        return;
      }

      setState('success');
      setEmail('');
    } catch {
      setErrorMessage('Network error. Please try again.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-white font-medium text-sm">You&apos;re on the list!</p>
        <p className="text-[#888] text-xs mt-1">We&apos;ll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3"
    >
      <p className="text-white font-medium text-sm text-center">Stay in touch</p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={state === 'submitting'}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/30 disabled:opacity-50"
      />

      {state === 'error' && (
        <p className="text-red-400 text-xs text-center">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting' || !email}
        className="w-full bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white text-sm font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? 'Submitting…' : 'Subscribe'}
      </button>
    </form>
  );
}
