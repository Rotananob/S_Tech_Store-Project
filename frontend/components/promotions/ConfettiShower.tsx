"use client";

import { useEffect, useRef } from "react";

interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  angle: number;
  rotationSpeed: number;
  shape: "rect" | "circle" | "star";
  opacity: number;
}

const COLORS = [
  "#FFD700", // Gold
  "#FF3B30", // Bright Red
  "#FF9500", // Amber
  "#34C759", // Emerald
  "#007AFF", // Blue
  "#AF52DE", // Purple
  "#FF2D55", // Rose
  "#FFCC00", // Warm Yellow
  "#00C7BE", // Teal
];

export default function ConfettiShower({ duration = 5000 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const pieces: ConfettiPiece[] = [];
    const count = Math.min(160, Math.floor(width / 8));

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.8,
        size: Math.random() * 8 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedY: Math.random() * 3.5 + 2.5,
        speedX: (Math.random() - 0.5) * 2.5,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: Math.random() > 0.4 ? "rect" : Math.random() > 0.5 ? "circle" : "star",
        opacity: 1,
      });
    }

    let animId: number;
    const startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const elapsed = Date.now() - startTime;
      const isFading = elapsed > duration - 1200;
      const fadeProgress = isFading ? Math.max(0, (duration - elapsed) / 1200) : 1;

      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(p.angle) * 1.5 + p.speedX;
        p.angle += p.rotationSpeed;

        if (p.y > height + 20) {
          // Recycle to top if not fading
          if (!isFading) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity * fadeProgress;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 4-pointed sparkle star
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 4, -p.size / 4);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(p.size / 4, p.size / 4);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 4, p.size / 4);
          ctx.lineTo(-p.size / 2, 0);
          ctx.lineTo(-p.size / 4, -p.size / 4);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      if (elapsed < duration) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
