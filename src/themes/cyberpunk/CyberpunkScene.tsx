import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeSceneProps } from "../types";
import { damp, sampleBands } from "../shared/analysis";
import { NowPlayingSign, TransportCluster } from "../shared/Controls3D";

/* A dark neon cityscape: a grid of glowing towers that pulse to the music and a
   wireframe core that breathes with the overall level. */

function CameraRig() {
  useFrame((s) => {
    s.camera.position.set(0, 4, 14);
    s.camera.lookAt(0, 1.5, -4);
  });
  return null;
}

const NEON = ["#00f2ff", "#ff007b", "#b967ff", "#00ff9d"];

const TOWERS = (() => {
  const out: { x: number; z: number; h: number; band: 0 | 1 | 2; color: string }[] = [];
  let i = 0;
  for (let x = -7; x <= 7; x += 2) {
    for (let z = -12; z <= -2; z += 2) {
      out.push({ x, z, h: 1 + ((i * 7) % 5) * 0.6, band: (i % 3) as 0 | 1 | 2, color: NEON[i % NEON.length] });
      i++;
    }
  }
  return out;
})();

function City({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, dt) => {
    const b = sampleBands(analyser, freq);
    const bands = [b.bass, b.mid, b.treble];
    for (let i = 0; i < TOWERS.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const target = TOWERS[i].h * (1 + bands[TOWERS[i].band] * 2.2);
      const sy = damp(m.scale.y, target, 9, dt);
      m.scale.y = sy;
      m.position.y = sy / 2;
    }
  });

  return (
    <group>
      {TOWERS.map((t, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[t.x, t.h / 2, t.z]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={t.color}
            emissive={t.color}
            emissiveIntensity={0.85}
            metalness={0.6}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Core({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    const { level } = sampleBands(analyser, freq);
    ref.current.scale.setScalar(damp(ref.current.scale.x, 1 + level * 0.9, 9, dt));
    ref.current.rotation.y += dt * 0.4;
    ref.current.rotation.x += dt * 0.15;
  });

  return (
    <mesh ref={ref} position={[0, 4, -7]}>
      <icosahedronGeometry args={[1.3, 1]} />
      <meshStandardMaterial color="#ff007b" emissive="#ff007b" emissiveIntensity={1.3} wireframe toneMapped={false} />
    </mesh>
  );
}

export default function CyberpunkScene({ analyser }: ThemeSceneProps) {
  return (
    <>
      <CameraRig />
      <color attach="background" args={["#05010a"]} />
      <fog attach="fog" args={["#05010a", 14, 34]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 9, 3]} color="#00f2ff" intensity={70} distance={45} />
      <pointLight position={[-7, 4, -9]} color="#ff007b" intensity={45} distance={35} />

      <City analyser={analyser} />
      <Core analyser={analyser} />

      {/* Reflective ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0a0014" metalness={0.85} roughness={0.4} />
      </mesh>

      {/* Diegetic controls */}
      <Billboard position={[0, 1.6, 6]}>
        <NowPlayingSign variant="cyberpunk" width={3.2} position={[0, 0.9, 0]} />
        <TransportCluster body="#0b0b16" icon="#00f2ff" size={0.6} position={[0, -0.5, 0]} />
      </Billboard>
    </>
  );
}
