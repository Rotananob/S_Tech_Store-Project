"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeFlyToCart, FlyItem } from "@/lib/flyToCart";

export default function FlyToCartOverlay() {
  const [flyingItems, setFlyingItems] = useState<FlyItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeFlyToCart((item) => {
      setFlyingItems((prev) => [...prev, item]);
    });
    return unsubscribe;
  }, []);

  const handleComplete = (id: string, item: FlyItem) => {
    setFlyingItems((prev) => prev.filter((i) => i.id !== id));

    // Trigger cart icon bounce
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    let target = isMobile ? document.getElementById("bottom-nav-cart-icon") : null;
    if (!target) {
      target = document.getElementById("navbar-cart-icon");
    }

    if (target) {
      target.classList.add("scale-125", "transition-transform", "duration-200");
      setTimeout(() => {
        target?.classList.remove("scale-125");
      }, 250);
    }

    // Gentle haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([15, 30, 15]);
      } catch (e) {}
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => {
          // Calculate an attractive upward arc
          const midX = (item.startX + item.endX) / 2 + 25;
          const midY = Math.min(item.startX, item.endY) - 75;

          return (
            <motion.div
              key={item.id}
              initial={{
                position: "fixed",
                left: item.startX - 36,
                top: item.startY - 36,
                scale: 1.25,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                left: [item.startX - 36, midX - 25, item.endX - 16],
                top: [item.startY - 36, midY - 25, item.endY - 16],
                scale: [1.25, 0.85, 0.18],
                opacity: [1, 0.95, 0.15],
                rotate: [0, 15, -10, 0],
              }}
              transition={{
                duration: 0.78,
                times: [0, 0.45, 1],
                ease: [0.25, 0.1, 0.25, 1],
              }}
              onAnimationComplete={() => handleComplete(item.id, item)}
              className="w-18 h-18 rounded-2xl p-1 bg-white border-2 border-red-500 shadow-2xl flex items-center justify-center overflow-hidden pointer-events-none"
              style={{
                boxShadow: "0 12px 30px rgba(220, 38, 38, 0.45), 0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={item.imageUrl}
                alt="Flying product"
                className="w-full h-full object-contain rounded-xl"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
