"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  Bell,
  ChevronDown,
  Cpu,
  Monitor,
  Keyboard,
  HardDrive,
  Gamepad2,
  Wifi,
  Package,
  Laptop,
} from "lucide-react";

const categories = [
  { name: "Laptops", slug: "laptops", icon: Laptop },
  { name: "Desktops", slug: "desktops", icon: Monitor },
  { name: "Monitors", slug: "monitors", icon: Monitor },
  { name: "Keyboards", slug: "keyboards", icon: Keyboard },
  { name: "Gaming Gear", slug: "gaming-gear", icon: Gamepad2 },
  { name: "Storage", slug: "storage", icon: HardDrive },
  { name: "Networking", slug: "networking", icon: Wifi },
  { name: "Accessories", slug: "accessories", icon: Package },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cartCount = 3; // placeholder
  const wishlistCount = 5; // placeholder

  return (
    <>
      {/* Top Announcement Bar */}
      <div
        style={{
          background: "var(--gradient-brand)",
          padding: "8px 0",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: "500",
          letterSpacing: "0.02em",
        }}
      >
        🎉 Free Shipping on orders over $99 — Use code{" "}
        <strong>STECH10</strong> for 10% off!
      </div>

      {/* Main Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: isScrolled
            ? "rgba(10, 14, 26, 0.95)"
            : "var(--bg-surface)",
          backdropFilter: isScrolled ? "blur(16px)" : "none",
          borderBottom: "1px solid var(--border-default)",
          transition: "all var(--transition-base)",
        }}
      >
        <div
          className="container-main"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            height: "68px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "var(--gradient-brand)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "18px",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              S
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: "800",
                  fontSize: "18px",
                  lineHeight: "1",
                }}
              >
                <span className="gradient-text">S Tech</span>
                <span style={{ color: "var(--text-secondary)" }}> Store</span>
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Premium Tech
              </div>
            </div>
          </Link>

          {/* Category Dropdown */}
          <div
            style={{ position: "relative", flexShrink: 0 }}
            onMouseEnter={() => setIsCategoryOpen(true)}
            onMouseLeave={() => setIsCategoryOpen(false)}
          >
            <button
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              <Menu size={15} />
              All Categories
              <ChevronDown
                size={14}
                style={{
                  transform: isCategoryOpen ? "rotate(180deg)" : "none",
                  transition: "transform var(--transition-fast)",
                }}
              />
            </button>

            {isCategoryOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  width: "260px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "8px",
                  boxShadow: "var(--shadow-lg)",
                  animation: "fadeInUp 0.2s ease",
                  zIndex: 200,
                }}
              >
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.slug}
                      href={`/category/${cat.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          "rgba(37, 99, 235, 0.1)";
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          "var(--text-secondary)";
                      }}
                    >
                      <Icon size={16} />
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, position: "relative", maxWidth: "480px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search laptops, monitors, keyboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "44px", paddingRight: "44px" }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Nav Actions */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}
          >
            {/* Wishlist */}
            <Link href="/wishlist" className="btn-ghost" style={{ position: "relative", padding: "10px" }}>
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    background: "#ef4444",
                    borderRadius: "50%",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="btn-ghost" style={{ position: "relative", padding: "10px" }}>
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    background: "var(--brand-primary)",
                    borderRadius: "50%",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account */}
            <Link href="/login" className="btn-primary" style={{ padding: "9px 18px" }}>
              <User size={16} />
              Sign In
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="btn-ghost"
            style={{ display: "none", padding: "10px" }}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
    </>
  );
}
