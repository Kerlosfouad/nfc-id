import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProductSection from "@/components/ProductSection";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

function SectionDivider() {
  return (
    <div className="relative mx-auto h-px w-full max-w-7xl px-4" aria-hidden="true">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#03A9F4]/55 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-8 w-40 -translate-x-1/2 -translate-y-1/2 bg-[#03A9F4]/10 blur-2xl" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-[#0b0a0a] min-h-screen">
      <Navbar />
      <HeroSection />
      <SectionDivider />
      <AboutSection />
      <SectionDivider />
      <FeaturesSection />
      <SectionDivider />
      <ProductSection />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <Testimonials />
      <SectionDivider />
      <CtaSection />
      <SectionDivider />
      <Footer />
    </main>
  );
}
