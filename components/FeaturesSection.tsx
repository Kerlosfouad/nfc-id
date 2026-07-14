"use client";

import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";

function PhoneProfile({ compact = false }: { compact?: boolean }) {
  const { isArabic } = useLanguage();
  const linkLabels = isArabic ? ["البريد", "الهاتف", "الموقع", "لينكدإن", "تحميل جهة الاتصال"] : ["Email", "Phone", "Website", "LinkedIn", "Download vCard"];
  return (
    <div
      className={`relative mx-auto overflow-hidden rounded-[2.2rem] border border-white/18 bg-[#08090a] shadow-[0_28px_55px_rgba(0,0,0,0.65)] ${
        compact ? "h-[360px] w-[190px] rotate-[12deg]" : "h-[430px] w-[230px] rotate-[9deg]"
      }`}
    >
      <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute inset-3 rounded-[1.75rem] border border-white/8" />
      <div className="relative z-10 flex h-full flex-col items-center px-5 pt-14">
        <div className="h-16 w-16 rounded-full border border-white/15 bg-[radial-gradient(circle_at_40%_30%,#8aa0aa,#1b262c_58%,#08090a)]" />
        <p className="mt-4 text-center text-lg font-semibold text-white">{isArabic ? "أليكس مورغان" : "Alex Morgan"}</p>
        <p className="mt-1 text-center text-xs text-white/58">{isArabic ? "مصمم منتجات" : "Product Designer"}</p>
        <div className="mt-2 h-0.5 w-9 rounded-full bg-[#03A9F4]" />
        <div className="mt-5 w-full space-y-2">
          {linkLabels.map((label) => (
            <div key={label} className="flex h-9 items-center gap-3 rounded-lg border border-white/6 bg-white/[0.055] px-3 text-xs text-white/72">
              <span className="h-3 w-3 rounded-sm border border-white/38" />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex w-full items-center justify-center gap-7 pb-7 text-[11px] text-white/58">
          <span className="text-[#03A9F4]">{isArabic ? "لمسة" : "Tap"}</span>
          <span className="h-7 w-px bg-white/18" />
          <span>{isArabic ? "مسح" : "Scan"}</span>
        </div>
      </div>
    </div>
  );
}

function EditProfilePhone() {
  const { isArabic } = useLanguage();
  const fields = isArabic
    ? [["الاسم الكامل", "أليكس مورغان"], ["المسمى", "مصمم منتجات"], ["البريد", "alex@morgan.com"], ["الهاتف", "(415) 555-0108"]]
    : [["Full name", "Alex Morgan"], ["Title", "Product Designer"], ["Email", "alex@morgan.com"], ["Phone", "(415) 555-0108"]];
  return (
    <div className="absolute bottom-[-88px] right-7 h-[410px] w-[220px] rotate-[13deg] overflow-hidden rounded-[2.1rem] border border-white/18 bg-[#08090a] shadow-[0_30px_60px_rgba(0,0,0,0.7)]">
      <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className="relative z-10 px-5 pt-12">
        <p className="text-center text-sm font-semibold italic text-white">{isArabic ? "تعديل الملف" : "Edit profile"}</p>
        <div className="mx-auto mt-6 h-16 w-16 rounded-full border border-white/15 bg-[radial-gradient(circle_at_40%_30%,#8aa0aa,#1b262c_58%,#08090a)]" />
        <div className="mt-6 space-y-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/6 bg-white/[0.055] px-3 py-3">
              <p className="text-[10px] text-white/38">{label}</p>
              <p className="mt-1 text-xs italic text-white/78">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const { isArabic } = useLanguage();
  return (
    <section className={`px-4 py-24 sm:py-32 ${isArabic ? "font-[Cairo]" : ""}`}>
      <div className="mx-auto w-full max-w-[1680px]">
        <div className="grid min-h-[820px] grid-cols-1 gap-0 overflow-hidden rounded-[1.7rem] lg:grid-cols-12 lg:grid-rows-[430px_390px]">
          <div className="relative border border-white/14 bg-black px-7 py-10 sm:px-12 lg:col-span-5">
            <div className="mb-8 flex items-center gap-4 text-sm text-white/50">
              <span className="font-semibold text-[#03A9F4]">2 / 6</span>
            </div>
            <h2 className="max-w-[640px] text-[clamp(3.2rem,4.9vw,5.9rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-white text-balance">
              {isArabic ? "تحكم في الوجهة بعد تسليم البطاقة." : "Control the destination after the card ships."}
            </h2>
            <p className="mt-8 max-w-[520px] text-xl leading-8 text-white/62">
              {isArabic ? "عدّل الروابط والملف والخصوصية في أي وقت." : "Edit links, profile, and privacy anytime."}
            </p>
          </div>

          <article className="feature-panel feature-panel-large group relative overflow-hidden border border-white/14 bg-[#070809] p-8 lg:col-span-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_34%,rgba(3,169,244,0.12),transparent_24rem)]" />
            <div className="relative z-10 max-w-[180px]">
              <h3 className="text-3xl font-semibold text-white">NFC + QR</h3>
              <p className="mt-5 text-lg leading-7 text-white/58">{isArabic ? "المس أو امسح فورًا." : "Tap or scan instantly."}</p>
            </div>
            <div className="feature-float-card absolute left-[24%] top-[12%] h-[290px] w-[320px] rotate-[-8deg]">
              <Image
                src="/assets/linkup/linkup-nfc-card.png"
                alt="LinkUp NFC card"
                width={640}
                height={460}
                className="h-full w-full object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,0.65)]"
              />
              <div className="feature-signal absolute right-12 top-12 h-16 w-16 text-center text-5xl leading-none text-[#03A9F4]">)))</div>
            </div>
            <div className="feature-phone-lift absolute bottom-[-30px] right-[6%] z-10">
              <PhoneProfile />
            </div>
          </article>

          <article className="feature-panel group relative min-h-[390px] overflow-hidden border border-white/14 bg-black p-7 lg:col-span-4">
            <h3 className="text-3xl font-semibold text-white">{isArabic ? "ملف قابل للتعديل" : "Editable profile"}</h3>
            <p className="mt-5 max-w-[230px] text-lg leading-7 text-white/62">
              {isArabic ? "عدّل مرة واحدة. يظهر فورًا." : "Edit once. Live instantly."}
            </p>
            <EditProfilePhone />
          </article>

          <article className="feature-panel group relative min-h-[390px] overflow-hidden border border-white/14 bg-black p-7 lg:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-3xl font-semibold text-white">{isArabic ? "التحليلات" : "Analytics"}</h3>
                <p className="mt-5 max-w-[230px] text-lg leading-7 text-white/62">{isArabic ? "تابع اللمسات وعمليات المسح." : "Track taps and scans."}</p>
              </div>
              <div className="border-l border-white/12 pl-7">
                <p className="text-sm text-white/60">{isArabic ? "لمسات" : "Taps"}</p>
                <p className="mt-3 text-4xl font-semibold tabular-nums text-white">1,248</p>
                <p className="mt-2 text-sm font-semibold text-[#03A9F4]">+18% <span className="text-white/45">{isArabic ? "مقارنة بآخر 7 أيام" : "vs last 7 days"}</span></p>
              </div>
            </div>
            <div className="absolute inset-x-8 bottom-8 h-[175px]">
              <svg className="h-full w-full" viewBox="0 0 520 190" preserveAspectRatio="none" aria-hidden="true">
                {[40, 85, 130, 175].map((y) => (
                  <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="rgba(255,255,255,0.1)" />
                ))}
                <path className="feature-chart-line" d="M0 125 C48 132 76 112 112 82 C146 54 170 70 202 107 C236 144 270 70 314 76 C366 83 370 22 408 36 C454 53 462 98 520 79" fill="none" stroke="#03A9F4" strokeWidth="4" />
                <path className="feature-chart-fill" d="M0 125 C48 132 76 112 112 82 C146 54 170 70 202 107 C236 144 270 70 314 76 C366 83 370 22 408 36 C454 53 462 98 520 79 L520 190 L0 190 Z" fill="rgba(3,169,244,0.16)" />
                <circle className="feature-chart-dot" cx="408" cy="36" r="8" fill="#03A9F4" />
              </svg>
              <div className="mt-1 grid grid-cols-6 text-xs text-white/55">
                {["May 6", "May 7", "May 8", "May 9", "May 10", "May 12"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </div>
          </article>

          <div className="grid min-h-[390px] lg:col-span-4 lg:grid-rows-2">
            <article className="feature-panel group relative border border-white/14 bg-black p-7">
              <div className="grid gap-8 md:grid-cols-[0.72fr_1fr]">
                <div>
                  <h3 className="text-3xl font-semibold text-white">{isArabic ? "جمع العملاء المحتملين" : "Lead capture"}</h3>
                  <p className="mt-4 text-lg leading-7 text-white/62">{isArabic ? "اجمع بيانات المهتمين من لمسة واحدة." : "Capture leads on tap."}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-4">
                  <div className="flex gap-3">
                    <div className="feature-input flex-1 rounded-xl bg-white/7 px-4 py-4 text-sm text-white/45">{isArabic ? "البريد الإلكتروني" : "Email address"}</div>
                    <div className="feature-save rounded-xl bg-[#03A9F4] px-5 py-4 text-sm font-bold text-[#061014]">{isArabic ? "حفظ" : "Save"}</div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 text-sm text-white/72">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70">✓</span>
                    <span>{isArabic ? "تم حفظ العميل" : "Lead saved"}</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="feature-panel group relative border border-white/14 bg-black p-7">
              <div className="grid gap-8 md:grid-cols-[0.72fr_1fr]">
                <div>
                  <h3 className="text-3xl font-semibold text-white">{isArabic ? "تحكم بالخصوصية" : "Private controls"}</h3>
                  <p className="mt-4 text-lg leading-7 text-white/62">{isArabic ? "حدد ما تريد مشاركته." : "Control what is shared."}</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.035]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-sm text-white/74">
                    <span>{isArabic ? "ظهور الملف" : "Profile visibility"}</span>
                    <span>{isArabic ? "أي شخص ›" : "Anyone ›"}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4 text-sm text-white/74">
                    <span>{isArabic ? "إخفاء بيانات التواصل" : "Hide contact details"}</span>
                    <span className="feature-toggle relative h-7 w-12 rounded-full bg-[#03A9F4]">
                      <span className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
