"use client";

import * as React from "react";

const STAR_COUNT = 72;

interface Star {
  left: string;
  top: string;
  size: string;
  opacity: number;
  delay: string;
  duration: string;
  depth: number;
}

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, index) => ({
    left: `${(index * 47 + 11) % 100}%`,
    top: `${(index * 71 + 7) % 100}%`,
    size: `${index % 9 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
    opacity: 0.22 + ((index * 17) % 48) / 100,
    delay: `${-((index * 13) % 8)}s`,
    duration: `${4 + (index % 6)}s`,
    depth: 0.25 + (index % 5) * 0.16,
  }));
}

const STARS = createStars();

export function SpaceBackdrop() {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      setOffset({
        x: (event.clientX / window.innerWidth - 0.5) * 12,
        y: (event.clientY / window.innerHeight - 0.5) * 8,
      });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#080b14]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_22%,rgba(36,43,92,0.2),transparent_42%),radial-gradient(ellipse_at_20%_78%,rgba(24,35,74,0.12),transparent_38%)]" />
      <div
        className="absolute inset-[-12px] transition-transform duration-700 ease-out"
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      >
        {STARS.map((star, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-ink animate-star-twinkle"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration,
              transform: `translate3d(${offset.x * star.depth}px, ${offset.y * star.depth}px, 0)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SpaceBackdropStyles() {
  return null;
}
