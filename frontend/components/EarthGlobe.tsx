"use client";

import * as React from "react";
import { useInView } from "framer-motion";

/**
 * Procedurally-rendered 3D Earth globe — hero visual for the landing page.
 * Adapted from a Framer code component (Framer-only imports and property
 * controls removed). Fully offline: the surface is fBm noise, not an asset.
 */
interface EarthGlobeProps {
  accentColor?: string;
  rotationSpeed?: number;
  size?: number;
  gridLineOpacity?: number;
  enableParallax?: boolean;
  baseColor?: string;
  landColor?: string;
  className?: string;
}

type RGB = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x: number, y: number): number {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  for (let i = 0; i < 5; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

function colorToRgb(color: string): RGB {
  if (typeof window !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    }
  }
  return { r: 0, g: 0, b: 0 };
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  const m = clamp(t, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * m),
    g: Math.round(a.g + (b.g - a.g) * m),
    b: Math.round(a.b + (b.b - a.b) * m),
  };
}

function makeEarthTexture(baseColor: string, landColor: string): HTMLCanvasElement | null {
  if (typeof window === "undefined") return null;
  const texW = 512;
  const texH = 256;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = texW;
  textureCanvas.height = texH;
  const ctx = textureCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const ocean = colorToRgb(baseColor);
  const land = colorToRgb(landColor);
  const coast = mixColor(land, { r: 130, g: 150, b: 160 }, 0.18);
  const image = ctx.createImageData(texW, texH);
  const data = image.data;
  for (let y = 0; y < texH; y++) {
    const v = y / (texH - 1);
    const lat = (v - 0.5) * Math.PI;
    const polarFade = Math.pow(Math.cos(lat), 0.35);
    for (let x = 0; x < texW; x++) {
      const u = x / (texW - 1);
      const nx = u * 4.7;
      const ny = v * 2.8;
      const n1 = fbm(nx + 13.2, ny - 7.4);
      const n2 = fbm(nx * 0.6 - 4.1, ny * 0.6 + 8.9);
      const ridge = Math.abs(n1 - 0.5) * 1.7;
      const mask = n1 * 0.72 + n2 * 0.4 - ridge * 0.34 + polarFade * 0.1;
      const isLand = mask > 0.54;
      const coastMix = clamp((mask - 0.5) / 0.08, 0, 1);
      const oceanShade = 0.88 + 0.18 * Math.sin((u * Math.PI * 2 + v * 0.8) * 2.4);
      const oceanColor = {
        r: clamp(Math.round(ocean.r * oceanShade), 0, 255),
        g: clamp(Math.round(ocean.g * oceanShade), 0, 255),
        b: clamp(Math.round(ocean.b * (oceanShade + 0.03)), 0, 255),
      };
      const landTone = mixColor(coast, land, clamp((mask - 0.54) * 3, 0, 1));
      const finalColor = isLand ? mixColor(oceanColor, landTone, coastMix) : oceanColor;
      const idx = (y * texW + x) * 4;
      data[idx] = finalColor.r;
      data[idx + 1] = finalColor.g;
      data[idx + 2] = finalColor.b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return textureCanvas;
}

export function EarthGlobe({
  accentColor = "#d98f4e",
  rotationSpeed = 0.15,
  size = 560,
  gridLineOpacity = 0.25,
  enableParallax = true,
  baseColor = "#060b14",
  landColor = "#2a3b4d",
  className,
}: EarthGlobeProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const globeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const textureRef = React.useRef<HTMLCanvasElement | null>(null);
  const rotationRef = React.useRef(0);
  const tiltTargetRef = React.useRef({ x: 0, y: 0 });
  const tiltCurrentRef = React.useRef({ x: 0, y: 0 });
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const inView = useInView(rootRef, { amount: 0.2 });

  const renderSize = React.useMemo(
    () => clamp(Math.round(size * 0.56), 260, 540),
    [size],
  );
  const radius = renderSize * 0.5;
  const shouldAnimate = inView;

  React.useEffect(() => {
    textureRef.current = makeEarthTexture(baseColor, landColor);
  }, [baseColor, landColor]);

  const drawSphereFrame = React.useCallback(
    (rotationDeg: number) => {
      if (typeof window === "undefined") return false;
      const canvas = globeCanvasRef.current;
      const texture = textureRef.current;
      if (!canvas || !texture) return false;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const texCtx = texture.getContext("2d", { willReadFrequently: true });
      if (!ctx || !texCtx) return false;

      const texData = texCtx.getImageData(0, 0, texture.width, texture.height).data;
      const frame = ctx.createImageData(renderSize, renderSize);
      const frameData = frame.data;
      const texW = texture.width;
      const texH = texture.height;
      const light = { x: -0.4, y: 0.2, z: 0.9 };
      const lightLength = Math.hypot(light.x, light.y, light.z) || 1;
      const lightDir = {
        x: light.x / lightLength,
        y: light.y / lightLength,
        z: light.z / lightLength,
      };
      const rotRad = (rotationDeg * Math.PI) / 180;

      for (let y = 0; y < renderSize; y++) {
        const ny = (y - radius) / radius;
        for (let x = 0; x < renderSize; x++) {
          const nx = (x - radius) / radius;
          const idx = (y * renderSize + x) * 4;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) {
            frameData[idx + 3] = 0;
            continue;
          }
          const nz = Math.sqrt(1 - r2);
          const lon = Math.atan2(nx, nz) + rotRad;
          const lat = Math.asin(ny);
          const u = fract(lon / (Math.PI * 2) + 0.5);
          const v = 0.5 - lat / Math.PI;
          const tx = Math.floor(u * (texW - 1));
          const ty = clamp(Math.floor(v * (texH - 1)), 0, texH - 1);
          const tidx = (ty * texW + tx) * 4;
          const dot = clamp(nx * lightDir.x + ny * lightDir.y + nz * lightDir.z, 0, 1);
          const shade = 0.3 + dot * 0.8;
          const rim = Math.pow(1 - nz, 2.8) * 0.25;
          frameData[idx] = clamp(Math.round(texData[tidx] * shade + 140 * rim), 0, 255);
          frameData[idx + 1] = clamp(
            Math.round(texData[tidx + 1] * shade + 165 * rim),
            0,
            255,
          );
          frameData[idx + 2] = clamp(
            Math.round(texData[tidx + 2] * shade + 180 * rim),
            0,
            255,
          );
          frameData[idx + 3] = 255;
        }
      }
      ctx.putImageData(frame, 0, 0);
      return true;
    },
    [radius, renderSize],
  );

  React.useEffect(() => {
    if (textureRef.current === null) {
      textureRef.current = makeEarthTexture(baseColor, landColor);
    }
    drawSphereFrame(rotationRef.current);
  }, [baseColor, landColor, drawSphereFrame]);

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enableParallax) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tiltTargetRef.current = {
        x: clamp(py * -9, -6, 6),
        y: clamp(px * 10, -7, 7),
      };
    },
    [enableParallax],
  );

  const onPointerLeave = React.useCallback(() => {
    tiltTargetRef.current = { x: 0, y: 0 };
  }, []);

  React.useEffect(() => {
    if (!shouldAnimate) return;
    if (typeof window === "undefined") return;
    const drewStatic = drawSphereFrame(rotationRef.current);
    if (!drewStatic) return;
    let raf = 0;
    const draw = () => {
      rotationRef.current += rotationSpeed;
      const tiltCurrent = tiltCurrentRef.current;
      const tiltTarget = tiltTargetRef.current;
      tiltCurrent.x += (tiltTarget.x - tiltCurrent.x) * 0.07;
      tiltCurrent.y += (tiltTarget.y - tiltCurrent.y) * 0.07;
      React.startTransition(() => {
        setTilt({ x: tiltCurrent.x, y: tiltCurrent.y });
      });
      drawSphereFrame(rotationRef.current);
      raf = window.requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [rotationSpeed, shouldAnimate, drawSphereFrame]);

  return (
    <div
      ref={rootRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes earth-globe-ring-rotate-a { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes earth-globe-ring-rotate-b { from { transform: translate(-50%, -50%) rotate(360deg); } to { transform: translate(-50%, -50%) rotate(0deg); } }
        @keyframes earth-globe-scan-arc { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
      `}</style>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transform: `perspective(${size * 1.5}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: shouldAnimate ? "none" : "transform 0.4s ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "8%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 22%, rgba(8,13,22,0.0) 44%), radial-gradient(circle at 52% 55%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.65) 100%)",
          }}
        />
        <canvas
          ref={globeCanvasRef}
          width={renderSize}
          height={renderSize}
          style={{
            position: "absolute",
            inset: "8%",
            width: "84%",
            height: "84%",
            borderRadius: "50%",
            background: baseColor,
          }}
        />
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
        >
          <defs>
            <radialGradient id="earthAtmosphere" cx="50%" cy="50%" r="50%">
              <stop offset="84%" stopColor="rgba(255,255,255,0)" />
              <stop offset="96%" stopColor="rgba(166,205,220,0.10)" />
              <stop offset="100%" stopColor="rgba(166,205,220,0.18)" />
            </radialGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={size * 0.42} fill="url(#earthAtmosphere)" />
          {Array.from({ length: 8 }).map((_, i) => {
            const rr = size * 0.42 * Math.cos((i / 8) * (Math.PI / 2));
            return (
              <ellipse
                key={`lat-${i}`}
                cx={size / 2}
                cy={size / 2}
                rx={size * 0.42}
                ry={Math.max(8, rr)}
                fill="none"
                stroke={accentColor}
                strokeOpacity={gridLineOpacity * 0.55}
                strokeWidth={1}
              />
            );
          })}
          {Array.from({ length: 10 }).map((_, i) => {
            const x = size / 2 + Math.sin((i / 10) * Math.PI) * size * 0.42;
            return (
              <line
                key={`lon-${i}`}
                x1={x}
                y1={size * 0.08}
                x2={size - x}
                y2={size * 0.92}
                stroke={accentColor}
                strokeOpacity={gridLineOpacity * 0.38}
                strokeWidth={0.8}
              />
            );
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "108%",
            height: "72%",
            borderRadius: "50%",
            border: `1px solid ${accentColor}`,
            opacity: 0.26,
            transform: "translate(-50%, -50%) rotate(22deg)",
            animation: shouldAnimate ? "earth-globe-ring-rotate-a 32s linear infinite" : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "120%",
            height: "78%",
            borderRadius: "50%",
            border: `1px solid ${accentColor}`,
            opacity: 0.16,
            transform: "translate(-50%, -50%) rotate(-18deg)",
            animation: shouldAnimate ? "earth-globe-ring-rotate-b 45s linear infinite" : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "112%",
            height: "76%",
            borderRadius: "50%",
            borderTop: `2px solid ${accentColor}`,
            borderRight: "2px solid transparent",
            borderBottom: "2px solid transparent",
            borderLeft: "2px solid transparent",
            opacity: 0.62,
            transform: "translate(-50%, -50%)",
            animation: shouldAnimate ? "earth-globe-scan-arc 14s linear infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}
