import Link from "next/link";
import Image from "next/image";

const sections = [
  {
    title: "Using LinkUp",
    body: "LinkUp lets you create and share a digital profile through NFC and QR links. Keep your profile information accurate and only publish content you have the right to share.",
  },
  {
    title: "Accounts and tags",
    body: "You are responsible for your account access and for the NFC tags linked to it. If a tag is lost, misused, or should be suspended, contact support or manage it from your dashboard where available.",
  },
  {
    title: "Privacy",
    body: "Profile data, links, lead forms, and scan analytics are used to run the service and improve your experience. Avoid adding sensitive personal data that you do not want visitors to see.",
  },
  {
    title: "Acceptable use",
    body: "Do not use LinkUp for impersonation, harmful content, spam, illegal activity, or attempts to interfere with the platform. We may restrict profiles or tags that violate these rules.",
  },
  {
    title: "Changes",
    body: "These terms may be updated as the product evolves. Continued use of the service means you accept the latest version shown on this page.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0b0a0a] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <nav className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <Image src="/img/logo.png" alt="LinkUp" width={40} height={40} className="rounded-full object-contain" />
            <span className="text-lg font-bold tracking-wide">LinkUp</span>
          </Link>
          <Link href="/dashboard" className="boton-elegante boton-tow px-5 text-sm">
            Dashboard
          </Link>
        </nav>

        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#03A9F4]">
            Legal
          </p>
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Terms and Privacy</h1>
          <p className="max-w-2xl font-['Inter'] text-base leading-7 text-white/60">
            A clear summary of the basic rules for using LinkUp profiles, tags, and dashboard features.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
              <p className="font-['Inter'] text-sm leading-6 text-white/60">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 font-['Inter'] text-sm text-white/45">
          Last updated: June 30, 2026
        </div>
      </section>
    </main>
  );
}
