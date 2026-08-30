"use client";

import * as React from "react";

const CONSTELLATION_IMAGE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-H1DomI6fZYwVTIZ3yKyfkyce9yQ7W0.png";

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
      <div
        className="absolute inset-[-18px] bg-cover bg-center bg-no-repeat transition-transform duration-[1800ms] ease-out"
        style={{
          backgroundImage: `url(${CONSTELLATION_IMAGE})`,
          transform: `translate3d(${offset.x * 0.28}px, ${offset.y * 0.28}px, 0) scale(1.025)`,
        }}
      />
      <div className="absolute inset-0 bg-[#080b14]/20" />
    </div>
  );
}

export function SpaceBackdropStyles() {
  return null;
}
