import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import PWAUpdatePrompt from "@/components/ui/PWAUpdatePrompt";
import FlyToCartOverlay from "@/components/cart/FlyToCartOverlay";
import PromotionPopupModal from "@/components/ui/PromotionPopupModal";
import RealtimeCoinRewardPopup from "@/components/wallet/RealtimeCoinRewardPopup";
import StoreModeGuard from "@/components/ui/StoreModeGuard";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-20 lg:pb-0" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreModeGuard />
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <div className="hidden lg:block">
        <Footer />
      </div>
      <BottomNav />
      <PWAUpdatePrompt />
      <FlyToCartOverlay />
      <PromotionPopupModal />
      <RealtimeCoinRewardPopup />
    </div>
  );
}
