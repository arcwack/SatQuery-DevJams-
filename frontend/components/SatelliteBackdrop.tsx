import { getGibsStaticImageUrl } from "@/lib/gibs";

/**
 * Full-bleed NASA GIBS satellite backdrop for the landing hero. A single
 * static image request (no Leaflet, no tile cascade) so it renders instantly
 * as a moody background rather than popping in as a map seconds later.
 */
export function SatelliteBackdrop() {
  const src = getGibsStaticImageUrl();
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

      {/* Dark film overlay — dials true-color toward a night look */}
      <div className="absolute inset-0 bg-[#02040a]/60" />
      {/* Edge vignette + left-side darkening so hero text stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, var(--color-void) 0%, rgba(5,7,11,0.5) 42%, transparent 64%), radial-gradient(ellipse 95% 85% at 55% 45%, transparent 45%, rgba(2,4,10,0.85) 100%)",
        }}
      />
    </div>
  );
}
