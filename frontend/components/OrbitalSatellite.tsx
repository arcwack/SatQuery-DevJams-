"use client";

/**
 * Restrained CSS/3D satellite — no WebGL, no images, no neon.
 * Palette: void-2/void-3 grays + signal-dim hairlines, a single small
 * signal sensor aperture with one low-alpha glow. Motion is a slow orbital
 * drift (not a 360° spin) plus a gentle bob; disabled under reduced motion.
 */

const BUS = { w: 150, h: 92, d: 58 };

const FACES = [
  { key: "front", w: BUS.w, h: BUS.h, t: `translate(-50%,-50%) translateZ(${BUS.d / 2}px)`, bg: "var(--color-void-3)" },
  { key: "back", w: BUS.w, h: BUS.h, t: `translate(-50%,-50%) rotateY(180deg) translateZ(${BUS.d / 2}px)`, bg: "var(--color-void-2)" },
  { key: "left", w: BUS.d, h: BUS.h, t: `translate(-50%,-50%) rotateY(-90deg) translateZ(${BUS.w / 2}px)`, bg: "var(--color-void-2)" },
  { key: "right", w: BUS.d, h: BUS.h, t: `translate(-50%,-50%) rotateY(90deg) translateZ(${BUS.w / 2}px)`, bg: "var(--color-void-3)" },
  { key: "top", w: BUS.w, h: BUS.d, t: `translate(-50%,-50%) rotateX(90deg) translateZ(${BUS.h / 2}px)`, bg: "var(--color-void-3)" },
  { key: "bottom", w: BUS.w, h: BUS.d, t: `translate(-50%,-50%) rotateX(-90deg) translateZ(${BUS.h / 2}px)`, bg: "var(--color-void-2)" },
];

const KEYFRAMES = `
  @keyframes os-drift { 0%, 100% { transform: rotateY(-8deg); } 50% { transform: rotateY(8deg); } }
  @keyframes os-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @media (prefers-reduced-motion: reduce) {
    .os-drift, .os-bob { animation: none !important; }
  }
`;

function SolarArray({ side }: { side: "left" | "right" }) {
  const sign = side === "right" ? 1 : -1;
  const offset = BUS.w / 2 + 20;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 20,
          height: 3,
          background: "var(--color-line)",
          transform: `translate(-50%,-50%) translateX(${sign * (BUS.w / 2 + 10)}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 130,
          height: 170,
          border: "1px solid var(--color-signal-dim)",
          opacity: 0.75,
          background:
            "linear-gradient(var(--color-signal-dim) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, var(--color-signal-dim) 1px, transparent 1px) 0 0 / 12px 12px, var(--color-void-2)",
          transform: `translate(-50%,-50%) translateX(${sign * offset}px) rotateY(90deg) rotateZ(${sign * 2}deg)`,
        }}
      />
    </>
  );
}

export function OrbitalSatellite({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: "relative", width: 420, height: 420, perspective: 1400 }}>
      <style>{KEYFRAMES}</style>

      {/* subtle halo behind the rig */}
      <div
        className="absolute inset-[20%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-signal-dim) 0%, transparent 60%)",
          opacity: 0.12,
        }}
      />

      <div
        className="os-bob absolute inset-0"
        style={{ transformStyle: "preserve-3d", animation: "os-bob 6s ease-in-out infinite" }}
      >
        <div
          className="os-drift absolute inset-0"
          style={{ transformStyle: "preserve-3d", animation: "os-drift 40s ease-in-out infinite" }}
        >
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {FACES.map((f) => (
              <div
                key={f.key}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: f.w,
                  height: f.h,
                  background: f.bg,
                  border: "1px solid var(--color-signal-dim)",
                  transform: f.t,
                }}
              />
            ))}

            <SolarArray side="left" />
            <SolarArray side="right" />

            {/* comms dish + mast */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 3,
                height: 24,
                background: "var(--color-line)",
                transform: `translate(-50%,-50%) translateY(-${BUS.h / 2 + 12}px)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1.5px solid var(--color-signal-dim)",
                background: "radial-gradient(circle at 50% 55%, var(--color-void-2), var(--color-void))",
                boxShadow: "0 0 12px 0 var(--color-signal-dim)",
                transform: `translate(-50%,-50%) translateY(-${BUS.h / 2 + 40}px) rotateX(58deg)`,
              }}
            />

            {/* SAR boom + sensor node */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 3,
                height: 38,
                background: "var(--color-line)",
                transform: `translate(-50%,-50%) translateY(${BUS.h / 2 + 19}px)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-signal)",
                boxShadow: "0 0 10px 1px var(--color-signal-dim)",
                transform: `translate(-50%,-50%) translateY(${BUS.h / 2 + 41}px)`,
              }}
            />

            {/* front sensor aperture — the single restrained glow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2px solid var(--color-signal)",
                background: "radial-gradient(circle, var(--color-void) 45%, var(--color-void-3) 75%)",
                boxShadow: "0 0 16px 0 var(--color-signal-dim)",
                transform: `translate(-50%,-50%) translateZ(${BUS.d / 2 + 1}px)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
