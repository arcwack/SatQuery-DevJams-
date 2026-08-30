/**
 * Landing hero backdrop: the user's photo of Earth from space (served from
 * /public as earth-from-space.jpg), darkened + gradient for headline legibility.
 */

export function SatelliteBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070b]" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/earth-from-space.jpg"
        alt=""
        loading="eager"
        fetchPriority="high"
        className="h-full w-full object-contain"
        style={{ transform: "scale(0.95)" }}
      />

      {/* Dark film overlay so the headline reads clearly */}
      <div className="absolute inset-0 bg-[#02040a]/45" />
      {/* Left-side darkening + edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(5,7,10,0.9) 0%, rgba(5,7,11,0.6) 34%, rgba(5,7,11,0.15) 60%, transparent 78%), radial-gradient(ellipse 95% 85% at 55% 45%, transparent 52%, rgba(2,4,10,0.85) 100%)",
        }}
      />
    </div>
  );
}
