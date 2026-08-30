"use client";

/**
 * CSS-only 3D satellite hero graphic — no images or WebGL. A six-faced
 * "bus" cuboid spins a full 360° on its Y axis while the whole rig bobs,
 * surrounded by orbital rings, a radar sweep, and two animated trajectory
 * arcs. All motion is disabled under prefers-reduced-motion.
 */

const MINT = "#8CFFBE";
const CYAN = "#22D3EE";
const AMBER = "#f2b632";

const BUS = { w: 170, h: 104, d: 66 };

// Realistic satellite: a gold-foil "bus" body with dark photovoltaic wings.
const FACES = [
  { key: "front", w: BUS.w, h: BUS.h, t: `translate(-50%,-50%) translateZ(${BUS.d / 2}px)`, bg: "linear-gradient(135deg, #d8b24a, #9a7424)" },
  { key: "back", w: BUS.w, h: BUS.h, t: `translate(-50%,-50%) rotateY(180deg) translateZ(${BUS.d / 2}px)`, bg: "linear-gradient(135deg, #8a6220, #5c4116)" },
  { key: "left", w: BUS.d, h: BUS.h, t: `translate(-50%,-50%) rotateY(-90deg) translateZ(${BUS.w / 2}px)`, bg: "linear-gradient(135deg, #b8913a, #7c5c1e)" },
  { key: "right", w: BUS.d, h: BUS.h, t: `translate(-50%,-50%) rotateY(90deg) translateZ(${BUS.w / 2}px)`, bg: "linear-gradient(135deg, #c7a243, #8a6622)" },
  { key: "top", w: BUS.w, h: BUS.d, t: `translate(-50%,-50%) rotateX(90deg) translateZ(${BUS.h / 2}px)`, bg: "linear-gradient(135deg, #e0be52, #ab7f2b)" },
  { key: "bottom", w: BUS.w, h: BUS.d, t: `translate(-50%,-50%) rotateX(-90deg) translateZ(${BUS.h / 2}px)`, bg: "linear-gradient(135deg, #6b4d18, #3f2d0d)" },
];

const MINT_PATH = "M 40 410 C 180 370, 250 190, 470 130";
const CYAN_PATH = "M 90 470 C 150 300, 300 320, 450 90";

const KEYFRAMES = `
  @keyframes es-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
  @keyframes es-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes es-ring-a { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
  @keyframes es-ring-b { from { transform: rotateZ(360deg); } to { transform: rotateZ(0deg); } }
  @keyframes es-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes es-dash { to { stroke-dashoffset: -20; } }
  @keyframes es-node { 0% { offset-distance: 0%; opacity: 0.35; } 50% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0.35; } }
  @keyframes es-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .es-spin, .es-bob, .es-ring-a, .es-ring-b, .es-sweep, .es-dash, .es-node, .es-pulse { animation: none !important; }
  }
`;

function SolarArray({ side }: { side: "left" | "right" }) {
  const sign = side === "right" ? 1 : -1;
  const offset = BUS.w / 2 + 22;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 22,
          height: 4,
          background: "#3a4550",
          transform: `translate(-50%,-50%) translateX(${sign * (BUS.w / 2 + 11)}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 150,
          height: 190,
          border: "1px solid rgba(34,211,238,0.35)",
          background:
            "linear-gradient(rgba(34,211,238,0.20) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, rgba(34,211,238,0.20) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(135deg, #0b2447, #071829)",
          transform: `translate(-50%,-50%) translateX(${sign * offset}px) rotateY(90deg) rotateZ(${sign * 3}deg)`,
        }}
      />
    </>
  );
}

export function EarthSatellite({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ position: "relative", width: 520, height: 520, perspective: 1500 }}
    >
      <style>{KEYFRAMES}</style>

      {/* Radar sweep */}
      <div
        className="es-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(34,211,238,0.30), rgba(34,211,238,0.03) 60deg, transparent 130deg)",
        }}
      />

      {/* Orbital rings */}
      <div className="es-ring-a absolute inset-0">
        <div
          className="absolute inset-[16%] rounded-full border"
          style={{ borderColor: "rgba(140,255,190,0.35)", transform: "rotateX(75deg)" }}
        />
      </div>
      <div className="es-ring-b absolute inset-0">
        <div
          className="absolute inset-[7%] rounded-full border"
          style={{ borderColor: "rgba(34,211,238,0.30)", transform: "rotateX(66deg) rotateY(22deg)" }}
        />
      </div>

      {/* Trajectory arcs */}
      <svg
        className="absolute inset-0"
        viewBox="0 0 520 520"
        fill="none"
        style={{ filter: "drop-shadow(0 0 4px rgba(140,255,190,0.35))" }}
      >
        <path
          className="es-dash"
          d={MINT_PATH}
          stroke={MINT}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="5 15"
          style={{ animation: "es-dash 1.6s linear infinite" }}
        />
        <path
          className="es-dash"
          d={CYAN_PATH}
          stroke={CYAN}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="5 15"
          style={{ animation: "es-dash 2.2s linear infinite reverse" }}
        />
      </svg>

      {/* Glowing node riding the mint trajectory */}
      <div
        className="es-node"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 14,
          height: 14,
          offsetPath: `path('${MINT_PATH}')`,
          offsetRotate: "0deg",
          offsetAnchor: "center",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${MINT} 0%, rgba(140,255,190,0.15) 60%, transparent 72%)`,
          boxShadow: "0 0 14px 3px rgba(140,255,190,0.55)",
        }}
      />

      {/* Satellite rig */}
      <div className="es-bob absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="es-spin absolute inset-0"
          style={{ transformStyle: "preserve-3d", animation: "es-spin 22s linear infinite" }}
        >
          {/* Bus cuboid */}
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
                  border: "1px solid rgba(140,255,190,0.22)",
                  transform: f.t,
                }}
              />
            ))}

            {/* Solar arrays */}
            <SolarArray side="left" />
            <SolarArray side="right" />

            {/* Comms dish + mast */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 4,
                height: 28,
                background: "#2a333c",
                transform: `translate(-50%,-50%) translateY(-${BUS.h / 2 + 14}px)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: `1.5px solid ${CYAN}`,
                background: "radial-gradient(circle at 50% 55%, #06131a 30%, rgba(6,19,26,0.4) 70%)",
                boxShadow: `0 0 16px 2px rgba(34,211,238,0.4)`,
                transform: `translate(-50%,-50%) translateY(-${BUS.h / 2 + 48}px) rotateX(58deg)`,
              }}
            />

            {/* SAR boom + sensor node */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 3,
                height: 42,
                background: "#2a333c",
                transform: `translate(-50%,-50%) translateY(${BUS.h / 2 + 21}px)`,
              }}
            />
            <div
              className="es-pulse"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: CYAN,
                boxShadow: "0 0 14px 3px rgba(34,211,238,0.7)",
                transform: `translate(-50%,-50%) translateY(${BUS.h / 2 + 46}px)`,
                animation: "es-pulse 2.4s ease-in-out infinite",
              }}
            />

            {/* Front sensor aperture */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: `2px solid ${CYAN}`,
                background: "radial-gradient(circle, #04080c 45%, #0a141a 70%)",
                boxShadow: `0 0 0 4px rgba(34,211,238,0.15), 0 0 18px 3px rgba(34,211,238,0.4)`,
                transform: `translate(-50%,-50%) translateZ(${BUS.d / 2 + 1}px)`,
              }}
            />

            {/* Amber trim line */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: BUS.w * 0.7,
                height: 2,
                background: AMBER,
                boxShadow: `0 0 8px rgba(242,182,50,0.7)`,
                transform: `translate(-50%,-50%) translateZ(${BUS.d / 2 + 1}px) translateY(${BUS.h / 2 - 8}px)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
