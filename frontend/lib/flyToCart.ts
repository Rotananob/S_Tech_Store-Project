export interface FlyItem {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  imageUrl: string;
}

type FlyListener = (item: FlyItem) => void;
const listeners: Set<FlyListener> = new Set();

export function subscribeFlyToCart(listener: FlyListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerFlyToCart(
  source: HTMLElement | { x: number; y: number } | React.MouseEvent | null | undefined, 
  imageUrl: string
) {
  if (typeof window === "undefined") return;

  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;

  if (source && source instanceof HTMLElement) {
    const rect = source.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  } else if (source && "clientX" in source) {
    startX = (source as React.MouseEvent).clientX;
    startY = (source as React.MouseEvent).clientY;
  } else if (source && "x" in source && "y" in source) {
    startX = (source as { x: number; y: number }).x;
    startY = (source as { x: number; y: number }).y;
  }

  // Find destination: on mobile check bottom nav first, else navbar
  const isMobile = window.innerWidth < 1024;
  let targetEl = isMobile ? document.getElementById("bottom-nav-cart-icon") : null;

  if (!targetEl || targetEl.offsetParent === null) {
    targetEl = document.getElementById("navbar-cart-icon");
  }

  let endX = window.innerWidth - 48;
  let endY = 48;

  if (targetEl) {
    const destRect = targetEl.getBoundingClientRect();
    endX = destRect.left + destRect.width / 2;
    endY = destRect.top + destRect.height / 2;
  }

  const flyItem: FlyItem = {
    id: Math.random().toString(36).substring(2, 9),
    startX,
    startY,
    endX,
    endY,
    imageUrl: imageUrl || "/placeholder.jpg",
  };

  listeners.forEach((fn) => fn(flyItem));
}
