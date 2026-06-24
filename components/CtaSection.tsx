import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="py-14 sm:py-24 px-5 sm:px-4">
      <div className="container mx-auto">
        <div className="relative bg-gradient-to-br from-[#0f1a2e] to-[#0b0a0a] border border-[#03A9F4]/20 rounded-3xl p-5 sm:p-12 text-center overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#03A9F4]/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#03A9F4]/30 bg-[#03A9F4]/10 text-[#03A9F4] text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-4 sm:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03A9F4] animate-pulse" />
              Free to Start
            </div>

            <h2 className="text-white text-2xl sm:text-4xl md:text-5xl font-bold uppercase mb-3 sm:mb-4 leading-tight">
              Your Link in Bio,<br />
              <span className="text-[#03A9F4]">Powered by NFC</span>
            </h2>

            <p className="text-[#555] text-sm sm:text-base max-w-[330px] sm:max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
              Join thousands of creators, professionals, and businesses who use NFC ID to share everything with one tap.
            </p>

            <div className="flex gap-2.5 sm:gap-4 justify-center flex-col sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 sm:h-auto items-center justify-center gap-2 px-6 sm:px-8 py-0 sm:py-3.5 rounded-full bg-[#03A9F4] text-white text-xs sm:text-base font-semibold uppercase tracking-wider hover:bg-[#03A9F4]/80 hover:shadow-[0_0_30px_rgba(3,169,244,0.5)] transition-all duration-300"
              >
                <i className="ri-rocket-line" />
                Get Your Free Link
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 sm:h-auto items-center justify-center gap-2 px-6 sm:px-8 py-0 sm:py-3.5 rounded-full border border-white/20 text-white text-xs sm:text-base font-semibold uppercase tracking-wider hover:border-white/50 hover:bg-white/5 transition-all duration-300"
              >
                Sign In
              </Link>
            </div>

            <p className="text-white/20 text-xs mt-6">No credit card required · Free forever plan available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
