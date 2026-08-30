/**
 * Landing hero backdrop: a NASA public-domain photo of Earth observed from
 * the International Space Station (spacecraft in the corner, blue ocean,
 * clouds, black space). Single image, immediate load. Dark overlay + left
 * gradient keep the headline legible.
 */

const EARTH_FROM_SPACE =
  "https://images-assets.nasa.gov/image/iss045e013851/iss045e013851~large.jpg";

export function SatelliteBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070b]" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={EARTH_FROM_SPACE}
        alt=""
        loading="eager"
        fetchPriority="high"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover object-center"
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
