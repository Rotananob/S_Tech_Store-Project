import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build Your Custom PC | S Tech Store",
  description: "Build your dream PC with our interactive Custom PC Builder. Select compatible parts and we will build it for you in Cambodia.",
  openGraph: {
    title: "Build Your Custom PC | S Tech Store",
    description: "Build your dream PC with our interactive Custom PC Builder. Select compatible parts and we will build it for you in Cambodia.",
  }
};

export default function BuildPCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
