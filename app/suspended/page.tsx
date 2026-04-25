import Link from "next/link";

export default function SuspendedPage() {
  return (
    <main className="bg-[#0b0a0a] min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold mb-3">Tag Suspended</h1>
        <p className="text-[#555] text-sm leading-relaxed mb-8">
          This NFC tag has been suspended and is no longer accessible.
          If you believe this is a mistake, please contact support.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-[#888] text-sm font-medium hover:text-white hover:border-[#03A9F4]/40 transition-all"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
