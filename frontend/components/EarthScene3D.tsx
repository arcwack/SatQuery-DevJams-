"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { SatelliteBackdrop } from "@/components/SatelliteBackdrop";
import { SpaceBackdrop } from "@/components/SpaceBackdrop";

/**
 * Interactive 3D hero: a wireframe / low-poly Earth with a fresnel
 * atmosphere glow, slowly self-rotating, orbited by a schematic satellite.
 * Scrolling past the hero drives the camera inward and sweeps the satellite
 * overhead — as if descending from orbit toward a point on the surface.
 *
 * A shared scroll-progress ref (0 at the top, 1 once the hero is scrolled
 * past) is read every frame so nothing re-renders React on scroll.
 */

const MINT = "#8CFFBE";
const DEEP = "#0c1420";
const EARTH_RADIUS = 2;
const DESCENT_SPAN = 1.15; // fraction of viewport height the "descent" takes

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Smooth limb light injected into the textured Earth material itself. */
const atmosphereColor = new THREE.Color("#8ed9ef");
const atmosphereIntensity = 0.72;

const EARTH_TEXTURES = [
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
  "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
];

function Earth({ progress }: { progress: React.RefObject<number> }) {
  const group = React.useRef<THREE.Group>(null);
  const [colorMap, normalMap, specularMap] = useLoader(THREE.TextureLoader, EARTH_TEXTURES);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={group} rotation={[0.35, 0, 0.12]}>
      {/* 2K public-domain-style Three.js example maps: color, terrain relief, ocean gloss. */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
        <meshPhongMaterial
          map={colorMap}
          bumpMap={normalMap}
          bumpScale={0.045}
          specularMap={specularMap}
          specular={new THREE.Color("#9cc5c8")}
          shininess={18}
          onBeforeCompile={(shader) => {
            shader.uniforms.uAtmosphereColor = { value: atmosphereColor };
            shader.uniforms.uAtmosphereIntensity = { value: atmosphereIntensity };
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                "#include <common>\\nvarying vec3 vAtmosphereView;",
              )
              .replace(
                "#include <project_vertex>",
                "#include <project_vertex>\\nvAtmosphereView = normalize(-mvPosition.xyz);",
              );
            shader.fragmentShader = shader.fragmentShader
              .replace(
                "#include <common>",
                "#include <common>\\nuniform vec3 uAtmosphereColor;\\nuniform float uAtmosphereIntensity;\\nvarying vec3 vAtmosphereView;",
              )
              .replace(
                "#include <dithering_fragment>",
                "float atmosphereFresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vAtmosphereView)), 0.0), 3.2);\\ngl_FragColor.rgb += uAtmosphereColor * atmosphereFresnel * uAtmosphereIntensity;\\n#include <dithering_fragment>",
              );
          }}
        />
      </mesh>

      {/* Target beacon on the surface the descent zeroes in on */}
      <TargetBeacon progress={progress} />
    </group>
  );
}

function TargetBeacon({ progress }: { progress: React.RefObject<number> }) {
  const ref = React.useRef<THREE.Mesh>(null);
  // Fixed point on the globe (front-ish, upper hemisphere).
  const pos = React.useMemo(() => {
    const lat = (34.85 * Math.PI) / 180;
    const lon = (-40 * Math.PI) / 180;
    const r = EARTH_RADIUS * 1.01;
    return new THREE.Vector3(
      r * Math.cos(lat) * Math.sin(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.cos(lon),
    );
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = progress.current ?? 0;
    const pulse = 0.6 + 0.4 * Math.sin(clock.elapsedTime * 3);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = p * pulse;
    ref.current.scale.setScalar(lerp(0.02, 0.06, p));
  });

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={MINT} transparent opacity={0} />
    </mesh>
  );
}

function Satellite({ progress }: { progress: React.RefObject<number> }) {
  const group = React.useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const p = progress.current ?? 0;
    const t = clock.elapsedTime * 0.35;
    // Radius shrinks as it descends; angle sweeps ~half a turn overhead.
    const radius = lerp(EARTH_RADIUS * 1.9, EARTH_RADIUS * 1.18, p);
    const angle = t + p * Math.PI * 1.1;
    const height = lerp(1.1, 2.1, p);
    group.current.position.set(
      radius * Math.cos(angle),
      height * Math.sin(t * 0.5) * (1 - p * 0.4) + p * 0.6,
      radius * Math.sin(angle),
    );
    group.current.lookAt(0, 0, 0);
  });

  return (
    <group ref={group} scale={0.9}>
      {/* Bus body */}
      <mesh>
        <boxGeometry args={[0.22, 0.16, 0.16]} />
        <meshStandardMaterial color="#d7e7dd" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Solar wings */}
      <mesh position={[0.34, 0, 0]}>
        <boxGeometry args={[0.34, 0.005, 0.2]} />
        <meshStandardMaterial color="#0e241a" emissive={MINT} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-0.34, 0, 0]}>
        <boxGeometry args={[0.34, 0.005, 0.2]} />
        <meshStandardMaterial color="#0e241a" emissive={MINT} emissiveIntensity={0.15} />
      </mesh>
      {/* Connecting booms */}
      <mesh position={[0.14, 0, 0]}>
        <boxGeometry args={[0.05, 0.01, 0.01]} />
        <meshBasicMaterial color="#3a4550" />
      </mesh>
      <mesh position={[-0.14, 0, 0]}>
        <boxGeometry args={[0.05, 0.01, 0.01]} />
        <meshBasicMaterial color="#3a4550" />
      </mesh>
      {/* Dish pointing down toward Earth (group faces origin) */}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.06, 16, 1, true]} />
        <meshBasicMaterial color={MINT} wireframe transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function CameraRig({ progress }: { progress: React.RefObject<number> }) {
  const { camera } = useThree();
  const target = React.useRef(new THREE.Vector3());

  useFrame(() => {
    const p = progress.current ?? 0;
    const eased = p * p * (3 - 2 * p); // smoothstep
    target.current.set(
      lerp(0, 0.5, eased),
      lerp(0.5, -0.4, eased),
      lerp(6.4, 3.0, eased),
    );
    camera.position.lerp(target.current, 0.06);
    camera.lookAt(0, lerp(0, -0.2, eased), 0);
  });

  return null;
}

function Scene({ progress }: { progress: React.RefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 2, 5]} intensity={1.6} color="#eaf6ff" />
      <directionalLight position={[3, -1, -2]} intensity={0.12} color="#d9f3ff" />
      <React.Suspense fallback={null}>
        <Earth progress={progress} />
      </React.Suspense>
      <Satellite progress={progress} />
      <CameraRig progress={progress} />
    </>
  );
}

export function EarthScene3D() {
  const [enabled, setEnabled] = React.useState(false);
  const progress = React.useRef(0);

  // Decide 3D vs. static fallback after mount (avoids SSR canvas + respects
  // reduced-motion / small screens).
  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallOrCoarse = window.matchMedia(
      "(max-width: 768px), (pointer: coarse)",
    ).matches;
    setEnabled(!reduce && !smallOrCoarse);
  }, []);

  // Drive the shared scroll-progress ref from a single passive listener.
  React.useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      const span = window.innerHeight * DESCENT_SPAN || 1;
      progress.current = clamp01(window.scrollY / span);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return <SatelliteBackdrop />;

  return (
    <div className="fixed inset-0" aria-hidden="true">
      <SpaceBackdrop />
      <Canvas
        camera={{ position: [0, 0.5, 6.4], fov: 45 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={["#080b14", 9, 18]} />
        <Scene progress={progress} />
      </Canvas>

      {/* Legibility wash — matches the original left-side vignette. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(5,7,10,0.92) 0%, rgba(5,7,11,0.6) 32%, rgba(5,7,11,0.12) 58%, transparent 78%), radial-gradient(ellipse 95% 85% at 55% 45%, transparent 55%, rgba(2,4,10,0.8) 100%)",
        }}
      />
    </div>
  );
}
