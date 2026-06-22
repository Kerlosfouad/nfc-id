import Navbar from "@/components/Navbar";
import ShopSection from "@/components/ShopSection";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Shop | NFC ID",
  description: "Shop NFC ID cards, keychains, and business bundles.",
};

export const dynamic = "force-dynamic";

export default function ShopPage() {
  return (
    <main className="bg-[#0b0a0a] min-h-screen">
      <Navbar />
      <div className="pt-24">
        <ShopSection />
      </div>
      <Footer />
    </main>
  );
}
