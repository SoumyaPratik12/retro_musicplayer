import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeSceneProps } from "../types";
import { damp, sampleBands } from "../shared/analysis";
import { NowPlayingSign, TransportCluster } from "../shared/Controls3D";

/* A retro-futuristic horizon: a striped sun, an endless scrolling neon grid, and
   a faceted orb that pulses with the bass. */

function CameraRig() {
  useFrame((s) => {
    s.camera.position.set(0, 2.6, 12);
    s.camera.lookAt(0, 2, -12);
  });
  return null;
}

function Sun() {
  return (
    <group position={[0, 6, -24]}>
      <mesh>
        <circleGeometry args={[8, 64]} />
        <meshBasicMaterial color="#ff6ac1" toneMapped={false} />
      </mesh>
      {/* Dark stripes across the lower half for the classic sunset look. */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, -1 - i * 0.85, 0.1]}>
          <planeGeometry args={[18, 0.42]} />
          <meshBasicMaterial color="#1a0033" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function MovingGrid() {
  const ref = useRef<THREE.GridHelper>(null!);
  useFrame((s) => {
    // Scroll toward the camera and loop, giving an endless-floor illusion.
    ref.current.position.z = (s.clock.elapsedTime * 3) % 4;
  });
  return <gridHelper ref={ref} args={[140, 70, "#ff6ac1", "#7a2bd6"]} position={[0, 0, 0]} />;
}

function Orb({ analyser }: ThemeSceneProps) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((s, dt) => {
    const { bass } = sampleBands(analyser, freq);
    ref.current.scale.setScalar(damp(ref.current.scale.x, 1 + bass * 0.6, 10, dt));
    ref.current.rotation.y += dt * 0.5;
    ref.current.position.y = 3 + Math.sin(s.clock.elapsedTime) * 0.3;
  });

  return (
    <mesh ref={ref} position={[0, 3, -7]}>
      <icosahedronGeometry args={[1.6, 0]} />
      <meshStandardMaterial
        color="#b967ff"
        emissive="#b967ff"
        emissiveIntensity={0.9}
        metalness={0.3}
        roughness={0.2}
        flatShading
        toneMapped={false}
      />
    </mesh>
  );
}

export default function VaporwaveScene({ analyser }: ThemeSceneProps) {
  return (
    <>
      <CameraRig />
      <color attach="background" args={["#1a0033"]} />
      <fog attach="fog" args={["#1a0033", 20, 48]} />

      <ambientLight intensity={0.5} />
      <pointLight position={[0, 7, 5]} color="#ff6ac1" intensity={55} distance={55} />

      <Sun />
      <MovingGrid />
      <Orb analyser={analyser} />

      {/* Diegetic controls */}
      <Billboard position={[0, 1.4, 7]}>
        <NowPlayingSign variant="vaporwave" width={3.2} position={[0, 0.9, 0]} />
        <TransportCluster body="#350042" icon="#ff6ac1" size={0.6} position={[0, -0.5, 0]} />
      </Billboard>
    </>
  );
}
