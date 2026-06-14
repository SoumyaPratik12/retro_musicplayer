import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeSceneProps } from "../types";
import { usePlayer } from "../../store/usePlayer";
import { BeatDetector, damp, sampleBands } from "../shared/analysis";
import { NowPlayingSign, TransportCluster } from "../shared/Controls3D";
import { buildIsland, type IslandData } from "./island";

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/* ----------------------------------------------------------- Island body */

function IslandBody({ data }: { data: IslandData }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    data.blocks.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      ref.current.setColorAt(i, b.color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [data]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.blocks.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.95} metalness={0} />
    </instancedMesh>
  );
}

function Trees({ data }: { data: IslandData }) {
  const spots = useMemo(() => {
    return data.surface
      .filter((c) => {
        const d = Math.hypot(c.x, c.z);
        return d > 2.5 && d < 5;
      })
      .filter((_, i) => i % 5 === 0)
      .slice(0, 3);
  }, [data]);

  return (
    <group>
      {spots.map((c, i) => (
        <group key={i} position={[c.x, c.y + 0.5, c.z]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.5, 2, 0.5]} />
            <meshStandardMaterial color="#6b4a2b" roughness={1} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[2, 1.8, 2]} />
            <meshStandardMaterial color="#3f7d2e" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ----------------------------------------------------- Reactive elements */

const BARS = 12;

function Equalizer({ analyser, baseY }: { analyser: AnalyserNode; baseY: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const heights = useRef<number[]>(new Array(BARS).fill(0.1));
  const colors = useMemo(
    () => Array.from({ length: BARS }, (_, i) => new THREE.Color().setHSL(i / BARS, 0.85, 0.55)),
    [],
  );

  useLayoutEffect(() => {
    for (let i = 0; i < BARS; i++) ref.current.setColorAt(i, colors[i]);
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame((_, dt) => {
    analyser.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
    const usable = Math.floor(freq.length * 0.45);
    const per = Math.max(1, Math.floor(usable / BARS));
    const startX = -((BARS - 1) * 0.55) / 2;

    for (let i = 0; i < BARS; i++) {
      let sum = 0;
      for (let j = 0; j < per; j++) sum += freq[i * per + j] ?? 0;
      const v = sum / per / 255;
      heights.current[i] = damp(heights.current[i], 0.15 + v * 3.2, 16, dt);
      const h = heights.current[i];
      dummy.position.set(startX + i * 0.55, baseY + h / 2, 0);
      dummy.scale.set(0.42, h, 0.42);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(colors[i]).multiplyScalar(0.4 + v * 2.2);
      ref.current.setColorAt(i, tmpColor);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BARS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={1} toneMapped={false} roughness={0.4} />
    </instancedMesh>
  );
}

function Jukebox({ analyser, y }: { analyser: AnalyserNode; y: number }) {
  const group = useRef<THREE.Group>(null!);
  const disc = useRef<THREE.Mesh>(null!);
  const torchMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const bob = useRef(0);

  useFrame((s, dt) => {
    const { bass } = sampleBands(analyser, freq);
    const playing = usePlayer.getState().isPlaying;
    bob.current = damp(bob.current, playing ? 1 : 0, 6, dt);
    group.current.position.y = y + 0.6 + Math.sin(s.clock.elapsedTime * 1.6) * 0.1 * bob.current;
    if (disc.current) disc.current.rotation.y += dt * (0.6 + bass * 6) * bob.current;
    const glow = 0.6 + bass * 4;
    for (const m of torchMats.current) m.emissiveIntensity = glow;
  });

  const torches: [number, number, number][] = [
    [-1.6, y + 0.2, -1.6],
    [1.6, y + 0.2, -1.6],
    [-1.6, y + 0.2, 1.6],
    [1.6, y + 0.2, 1.6],
  ];

  return (
    <group>
      <mesh position={[0, y - 0.2, 0]}>
        <boxGeometry args={[3.2, 1, 3.2]} />
        <meshStandardMaterial color="#241f33" roughness={0.6} metalness={0.3} />
      </mesh>
      <group ref={group} position={[0, y + 0.6, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshStandardMaterial color="#8a5a33" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.2, 0.18, 1.2]} />
          <meshStandardMaterial color="#2fb6a8" emissive="#1f7d72" emissiveIntensity={0.5} />
        </mesh>
        <mesh ref={disc} position={[0, 1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.05, 24]} />
          <meshStandardMaterial color="#15151a" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>
      {torches.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) torchMats.current[i] = m;
            }}
            color="#ffcf6b"
            emissive="#ffb938"
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const MAX_NOTES = 48;

function NoteParticles({ analyser, y }: { analyser: AnalyserNode; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const beat = useMemo(() => new BeatDetector(1.3, 220), []);
  const notes = useRef(
    Array.from({ length: MAX_NOTES }, () => ({
      life: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      hue: 0,
    })),
  );

  useFrame((s, dt) => {
    const { bass } = sampleBands(analyser, freq);
    const now = s.clock.elapsedTime * 1000;
    const playing = usePlayer.getState().isPlaying;

    if (playing && beat.update(bass, now)) {
      let spawned = 0;
      for (const n of notes.current) {
        if (n.life <= 0) {
          n.life = 1;
          n.pos.set((Math.random() - 0.5) * 1.6, y + 1.5, (Math.random() - 0.5) * 1.6);
          n.vel.set((Math.random() - 0.5) * 1, 2 + Math.random(), (Math.random() - 0.5) * 1);
          n.hue = Math.random();
          if (++spawned >= 3) break;
        }
      }
    }

    notes.current.forEach((n, i) => {
      if (n.life > 0) {
        n.life -= dt * 0.55;
        n.pos.addScaledVector(n.vel, dt);
        const sc = Math.max(0.001, n.life) * 0.32;
        dummy.position.copy(n.pos);
        dummy.scale.set(sc, sc, sc);
        dummy.rotation.set(0, n.pos.y, 0);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
        tmpColor.setHSL(n.hue, 0.8, 0.6).multiplyScalar(2);
        ref.current.setColorAt(i, tmpColor);
      } else {
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      }
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_NOTES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------- Float + camera */

function IslandContent({ analyser }: ThemeSceneProps) {
  const group = useRef<THREE.Group>(null!);
  const data = useMemo(() => buildIsland(), []);
  const top = data.centerTop;

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.6) * 0.22;
    group.current.rotation.y = Math.sin(t * 0.18) * 0.35; // gentle sway, not a full spin
  });

  return (
    <group ref={group} scale={0.92}>
      <IslandBody data={data} />
      <Trees data={data} />
      <Jukebox analyser={analyser} y={top + 1} />
      <Equalizer analyser={analyser} baseY={top + 3.2} />
      <NoteParticles analyser={analyser} y={top + 1} />
    </group>
  );
}

function CameraRig() {
  useFrame((s) => {
    s.camera.position.set(11, 9, 11);
    s.camera.lookAt(0, 0.2, 0);
  });
  return null;
}

export default function MinecraftScene({ analyser }: ThemeSceneProps) {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bcd9ff", "#3a2f25", 0.5]} />
      <directionalLight position={[6, 12, 8]} intensity={1.7} color="#fff2cf" />
      <directionalLight position={[-8, 4, -6]} intensity={0.4} color="#8fb6ff" />
      <IslandContent analyser={analyser} />

      {/* Diegetic controls — billboarded so they always face the camera. */}
      <Billboard position={[0, -4.2, 2.5]}>
        <NowPlayingSign variant="minecraft" width={2.8} position={[0, 1.05, 0]} />
        <TransportCluster body="#6b4a2b" icon="#ffd76b" size={0.55} position={[0, -0.35, 0]} />
      </Billboard>
    </>
  );
}
