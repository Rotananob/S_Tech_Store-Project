import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import PWAUpdatePrompt from "@/components/ui/PWAUpdatePrompt";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-20 lg:pb-0" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />
      <PWAUpdatePrompt />
    </div>
  );
}
