"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";

const sections = [
  {
    title: "Using LinkUp",
    arTitle: "استخدام LinkUp",
    body: "LinkUp lets you create and share a digital profile through NFC and QR links. Keep your profile information accurate and only publish content you have the right to share.",
    arBody: "يتيح لك LinkUp إنشاء ومشاركة ملف رقمي من خلال روابط NFC و QR. حافظ على دقة بيانات ملفك، ولا تنشر إلا المحتوى الذي تملك حق مشاركته.",
  },
  {
    title: "Accounts and tags",
    arTitle: "الحسابات والبطاقات",
    body: "You are responsible for your account access and for the NFC tags linked to it. If a tag is lost, misused, or should be suspended, contact support or manage it from your dashboard where available.",
    arBody: "أنت مسؤول عن الوصول إلى حسابك وعن بطاقات NFC المرتبطة به. إذا فُقدت بطاقة أو أسيء استخدامها أو احتجت إلى إيقافها، تواصل مع الدعم أو أدِرها من لوحة التحكم إذا كان ذلك متاحًا.",
  },
  {
    title: "Privacy",
    arTitle: "الخصوصية",
    body: "Profile data, links, lead forms, and scan analytics are used to run the service and improve your experience. Avoid adding sensitive personal data that you do not want visitors to see.",
    arBody: "تُستخدم بيانات الملف والروابط ونماذج العملاء المحتملين وتحليلات المسح لتشغيل الخدمة وتحسين تجربتك. تجنب إضافة بيانات شخصية حساسة لا ترغب أن يراها الزوار.",
  },
  {
    title: "Acceptable use",
    arTitle: "الاستخدام المقبول",
    body: "Do not use LinkUp for impersonation, harmful content, spam, illegal activity, or attempts to interfere with the platform. We may restrict profiles or tags that violate these rules.",
    arBody: "لا تستخدم LinkUp في انتحال الشخصية أو المحتوى الضار أو الرسائل المزعجة أو الأنشطة غير القانونية أو محاولات تعطيل المنصة. قد نقيد الملفات أو البطاقات التي تخالف هذه القواعد.",
  },
  {
    title: "Changes",
    arTitle: "التغييرات",
    body: "These terms may be updated as the product evolves. Continued use of the service means you accept the latest version shown on this page.",
    arBody: "قد يتم تحديث هذه الشروط مع تطور المنتج. استمرارك في استخدام الخدمة يعني موافقتك على أحدث نسخة معروضة في هذه الصفحة.",
  },
];

export default function TermsPage() {
  const { isArabic } = useLanguage();

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className={`min-h-screen bg-[#0b0a0a] text-white ${isArabic ? "font-[Cairo]" : ""}`}>
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <nav className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <Image src="/img/logo.png" alt="LinkUp" width={40} height={40} className="rounded-full object-contain" />
            <span className="text-lg font-bold tracking-wide">LinkUp</span>
          </Link>
          <Link href="/dashboard" className="boton-elegante boton-tow px-5 text-sm">
            {isArabic ? "لوحة التحكم" : "Dashboard"}
          </Link>
        </nav>

        <div className="mb-10">
          <p className={`mb-3 text-sm font-semibold text-[#03A9F4] ${isArabic ? "" : "uppercase tracking-[0.2em]"}`}>
            {isArabic ? "القانوني" : "Legal"}
          </p>
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{isArabic ? "الشروط والخصوصية" : "Terms and Privacy"}</h1>
          <p className={`max-w-2xl text-base leading-7 text-white/60 ${isArabic ? "" : "font-['Inter']"}`}>
            {isArabic
              ? "ملخص واضح للقواعد الأساسية لاستخدام ملفات LinkUp والبطاقات وميزات لوحة التحكم."
              : "A clear summary of the basic rules for using LinkUp profiles, tags, and dashboard features."}
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-2 text-xl font-semibold">{isArabic ? section.arTitle : section.title}</h2>
              <p className={`text-sm leading-6 text-white/60 ${isArabic ? "" : "font-['Inter']"}`}>{isArabic ? section.arBody : section.body}</p>
            </article>
          ))}
        </div>

        <div className={`mt-10 border-t border-white/10 pt-6 text-sm text-white/45 ${isArabic ? "" : "font-['Inter']"}`}>
          {isArabic ? "آخر تحديث: 30 يونيو 2026" : "Last updated: June 30, 2026"}
        </div>
      </section>
    </main>
  );
}
