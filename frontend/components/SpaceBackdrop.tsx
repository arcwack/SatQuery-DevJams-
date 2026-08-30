"use client";

import * as React from "react";

interface Star {
  cx: number;
  cy: number;
  radius: number;
  opacity: number;
  twinkle: boolean;
  delay: number;
}

function createStars(): Star[] {
  let seed = 781;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: 196 }, (_, index) => ({
    cx: random() * 1000,
    cy: random() * 1000,
    radius: index % 23 === 0 ? 2.1 : index % 7 === 0 ? 1.35 : 0.7 + random() * 0.45,
    opacity: index % 23 === 0 ? 0.92 : 0.32 + random() * 0.48,
    twinkle: index % 17 === 0,
    delay: (index % 9) * 0.9,
  }));
}

const STARS = createStars();

export function SpaceBackdrop() {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      setOffset({
        x: (event.clientX / window.innerWidth - 0.5) * 10,
        y: (event.clientY / window.innerHeight - 0.5) * 6,
      });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#080b14]" aria-hidden="true">
      <svg
        className="absolute inset-[-12px] h-[calc(100%+24px)] w-[calc(100%+24px)] transition-transform duration-[1800ms] ease-out"
        style={{ transform: `translate3d(${offset.x * 0.12}px, ${offset.y * 0.12}px, 0)` }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <radialGradient id="space-haze-a" cx="70%" cy="18%" r="52%">
            <stop offset="0" stopColor="#27355b" stopOpacity="0.16" />
            <stop offset="1" stopColor="#27355b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="space-haze-b" cx="18%" cy="78%" r="42%">
            <stop offset="0" stopColor="#1c3452" stopOpacity="0.11" />
            <stop offset="1" stopColor="#1c3452" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="1000" fill="#080b14" />
        <rect width="1000" height="1000" fill="url(#space-haze-a)" />
        <rect width="1000" height="1000" fill="url(#space-haze-b)" />
        {STARS.map((star, index) => (
          <circle
            key={index}
            cx={star.cx}
            cy={star.cy}
            r={star.radius}
            fill={index % 5 === 0 ? "#dff7ff" : "#ffffff"}
            opacity={star.opacity}
            className={star.twinkle ? "animate-star-twinkle" : undefined}
            style={star.twinkle ? { animationDelay: `${star.delay}s` } : undefined}
          />
        ))}
      </svg>
    </div>
  );
}

export function SpaceBackdropStyles() {
  return null;
}

