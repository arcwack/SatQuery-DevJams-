import { getBlueMarbleUrl } from "@/lib/gibs";

/**
 * Full-bleed, cloud-free "Blue Marble" Earth backdrop for the landing hero.
 * A single static image request (no Leaflet, no tile cascade), so it renders
 * instantly as a clear planet background rather than a cloudy daily mosaic.
 */
export function SatelliteBackdrop() {
  const src = getBlueMarbleUrl();
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070b]" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="eager"
        fetchPriority="high"
        className="h-full w-full object-cover"
      />

      {/* Subtle dark film overlay for legibility (lighter than before — the
          Blue Marble is already cloud-free and clear) */}
      <div className="absolute inset-0 bg-[#02040a]/45" />
      {/* Left-side darkening so hero text stays legible; vignette at edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(5,7,10,0.9) 0%, rgba(5,7,11,0.65) 32%, rgba(5,7,11,0.2) 58%, transparent 76%), radial-gradient(ellipse 95% 85% at 55% 45%, transparent 50%, rgba(2,4,10,0.85) 100%)",
        }}
      />
    </div>
  );
}
