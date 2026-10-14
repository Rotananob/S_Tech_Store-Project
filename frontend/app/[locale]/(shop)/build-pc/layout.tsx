import { Metadata } from "next";

export const metadata: Metadata = {
  title: "S Tech PC Builder — Custom Gaming PC Configurator | S Tech Store",
  description: "Build your dream custom gaming PC with S Tech Store's interactive PC Builder in Cambodia. Real-time compatibility check, RTX GPUs, liquid cooling, and expert assembly.",
  keywords: ["S Tech PC Builder", "S Tech Custom PC", "Build PC Cambodia", "Gaming PC S Tech Store", "PC Builder Phnom Penh"],
  alternates: {
    canonical: "https://www.s-tech-store.tech/build-pc",
  },
  openGraph: {
    title: "S Tech PC Builder — Custom Gaming PC Configurator | S Tech Store",
    description: "Build your dream custom gaming PC with S Tech Store's interactive PC Builder in Cambodia.",
    url: "https://www.s-tech-store.tech/build-pc",
  }
};

export default function BuildPCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
