import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeSceneProps } from "../types";
import { damp, sampleBands } from "../shared/analysis";
import { NowPlayingSign, TransportCluster } from "../shared/Controls3D";

/* ----------------------------------------------------------------------------
   Neon City — a living cyberpunk skyline.
   Lit-window skyscrapers frame a central avenue of streaming traffic light-trails,
   rooftop beacons blink, a central spire pulses with the bass, and the camera
   drifts slowly so the city always feels alive.
---------------------------------------------------------------------------- */

/** Procedural building face: a dark slab with randomly lit neon windows. */
function makeWindowTexture(seed: number): THREE.CanvasTexture {
  const W = 64;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#04040c";
  ctx.fillRect(0, 0, W, H);

  const palette = ["#00f2ff", "#ff007b", "#b967ff", "#ffd36b", "#00ff9d", "#7ab8ff"];
  let r = seed * 9973 + 7;
  const rand = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };

  const cols = 6;
  const rows = 18;
  const cw = W / cols;
  const rh = H / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rand();
      if (lit > 0.4) {
        ctx.fillStyle = lit > 0.82 ? palette[Math.floor(rand() * palette.length)] : "#16283f";
        ctx.fillRect(x * cw + 1.5, y * rh + 1.5, cw - 3, rh - 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const BUILDINGS = (() => {
  const arr: { x: number; z: number; h: number; w: number; tex: number }[] = [];
  let seed = 1;
  for (let gx = -11; gx <= 11; gx += 1.7) {
    if (Math.abs(gx) < 1.7) continue; // keep a central avenue open
    for (let z = -18; z <= 3; z += 2.3) {
      const h = 3 + ((seed * 13) % 7) + Math.random() * 4.5;
      const w = 1.0 + Math.random() * 0.6;
      arr.push({ x: gx + (Math.random() * 0.4 - 0.2), z, h, w, tex: seed % 4 });
      seed++;
    }
  }
  return arr;
})();

const BLINKERS = (() => {
  const arr: { x: number; y: number; z: number; color: string; phase: number }[] = [];
  for (let i = 0; i < BUILDINGS.length; i += 3) {
    const b = BUILDINGS[i];
    arr.push({
      x: b.x,
      y: b.h + 0.15,
      z: b.z,
      color: i % 7 === 0 ? "#33b5ff" : "#ff3b3b",
      phase: (i * 1.7) % 6.283,
    });
  }
  return arr;
})();

const CARS = (() => {
  const arr: { x: number; z: number; dir: 1 | -1; speed: number; color: string }[] = [];
  const lanes: { x: number; dir: 1 | -1 }[] = [
    { x: -1.0, dir: 1 },
    { x: -0.5, dir: 1 },
    { x: 0.5, dir: -1 },
    { x: 1.0, dir: -1 },
  ];
  for (let i = 0; i < 64; i++) {
    const lane = lanes[i % lanes.length];
    arr.push({
      x: lane.x,
      z: -18 + Math.random() * 36,
      dir: lane.dir,
      speed: 7 + Math.random() * 8,
      color: lane.dir > 0 ? "#ffe0a0" : "#ff2b4e", // headlights vs tail-lights
    });
  }
  return arr;
})();

function Skyline() {
  const texes = useMemo(() => [0, 1, 2, 3].map((s) => makeWindowTexture(s + 1)), []);
  useEffect(() => () => texes.forEach((t) => t.dispose()), [texes]);

  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            map={texes[b.tex]}
            emissiveMap={texes[b.tex]}
            emissive="#ffffff"
            emissiveIntensity={1.15}
            color="#070710"
            roughness={0.5}
            metalness={0.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Blinkers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < BLINKERS.length; i++) {
      const m = refs.current[i];
      if (m) m.visible = Math.sin(t * 2 + BLINKERS[i].phase) > 0.2;
    }
  });
  return (
    <group>
      {BLINKERS.map((bl, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[bl.x, bl.y, bl.z]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={bl.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Traffic({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const boost = useRef(1);

  useFrame((_, dt) => {
    const { level } = sampleBands(analyser, freq);
    boost.current = damp(boost.current, 1 + level * 1.6, 6, dt); // traffic speeds up with the music
    for (let i = 0; i < CARS.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      let z = m.position.z + CARS[i].dir * CARS[i].speed * boost.current * dt;
      if (z > 18) z = -18;
      else if (z < -18) z = 18;
      m.position.z = z;
    }
  });

  return (
    <group position={[0, 0.16, 0]}>
      {CARS.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[c.x, 0, c.z]}
        >
          <boxGeometry args={[0.12, 0.07, 1.3]} />
          <meshBasicMaterial color={c.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Spire({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const beacon = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    const { bass } = sampleBands(analyser, freq);
    const blink = Math.sin(s.clock.elapsedTime * 3) * 0.5 + 0.5;
    const mat = beacon.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.4 + bass * 3.5 + blink * 0.8;
  });

  return (
    <group position={[0, 0, -17]}>
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[0.18, 0.7, 20, 8]} />
        <meshStandardMaterial color="#0c1430" emissive="#1a3a6a" emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={beacon} position={[0, 20.4, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Two coloured key lights that pulse with the music. */
function PulseLights({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const cyan = useRef<THREE.PointLight>(null!);
  const pink = useRef<THREE.PointLight>(null!);

  useFrame((_, dt) => {
    const { bass, treble } = sampleBands(analyser, freq);
    cyan.current.intensity = damp(cyan.current.intensity, 45 + bass * 130, 8, dt);
    pink.current.intensity = damp(pink.current.intensity, 30 + treble * 90, 8, dt);
  });

  return (
    <>
      <pointLight ref={cyan} position={[0, 7, -3]} color="#00f2ff" distance={55} />
      <pointLight ref={pink} position={[-7, 5, -11]} color="#ff007b" distance={45} />
    </>
  );
}

function CameraRig() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.set(Math.sin(t * 0.06) * 3, 5 + Math.sin(t * 0.1) * 0.6, 15);
    s.camera.lookAt(0, 3, -6);
  });
  return null;
}

export default function CyberpunkScene({ analyser }: ThemeSceneProps) {
  return (
    <>
      <CameraRig />
      <color attach="background" args={["#0a0820"]} />
      <fog attach="fog" args={["#0a0820", 16, 42]} />

      <ambientLight intensity={0.35} color="#6f8cff" />
      <PulseLights analyser={analyser} />

      <Skyline />
      <Blinkers />
      <Spire analyser={analyser} />
      <Traffic analyser={analyser} />

      {/* Wet, reflective street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#05050f" metalness={0.9} roughness={0.45} />
      </mesh>

      {/* Diegetic controls */}
      <Billboard position={[0, 1.5, 7]}>
        <NowPlayingSign variant="cyberpunk" width={3.2} position={[0, 0.9, 0]} />
        <TransportCluster body="#0b0b16" icon="#00f2ff" size={0.6} position={[0, -0.5, 0]} />
      </Billboard>
    </>
  );
}
