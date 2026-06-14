import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { ThemeSceneProps } from "../types";
import { usePlayer } from "../../store/usePlayer";
import { damp, sampleBands } from "../shared/analysis";
import { NowPlayingSign, TransportCluster } from "../shared/Controls3D";

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/* ------------------------------------------------- Cutaway room shell */

function RoomShell() {
  return (
    <group>
      {/* floating base slab */}
      <mesh position={[-1, -0.5, -1]}>
        <boxGeometry args={[13, 1, 11]} />
        <meshStandardMaterial color="#2a211d" roughness={1} />
      </mesh>
      <mesh position={[-1, -1.3, -1]}>
        <boxGeometry args={[10, 0.8, 8]} />
        <meshStandardMaterial color="#1d1714" roughness={1} />
      </mesh>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0.01, -1]} receiveShadow>
        <planeGeometry args={[13, 11]} />
        <meshStandardMaterial color="#3a2d28" roughness={0.9} />
      </mesh>
      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0.02, 0]}>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#7d3b4a" roughness={1} />
      </mesh>
      {/* back wall */}
      <mesh position={[-1, 4, -6]}>
        <boxGeometry args={[13, 8, 0.3]} />
        <meshStandardMaterial color="#52423a" roughness={1} />
      </mesh>
      {/* left wall */}
      <mesh position={[-7.5, 4, -1]}>
        <boxGeometry args={[0.3, 8, 11]} />
        <meshStandardMaterial color="#473932" roughness={1} />
      </mesh>
      {/* window frame on back wall */}
      <mesh position={[-1, 4.2, -5.82]}>
        <boxGeometry args={[5, 4, 0.22]} />
        <meshStandardMaterial color="#2a211d" roughness={0.8} />
      </mesh>
      <mesh position={[-1, 4.2, -5.74]}>
        <boxGeometry args={[0.14, 3.6, 0.1]} />
        <meshStandardMaterial color="#1f1814" />
      </mesh>
      <mesh position={[-1, 4.2, -5.74]}>
        <boxGeometry args={[4.6, 0.14, 0.1]} />
        <meshStandardMaterial color="#1f1814" />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------- Window sky + rain */

const RAIN_COUNT = 240;
const WIN = { x0: -3.2, x1: 1.2, y0: 2.5, y1: 6, z: -5.7 };

function WindowSky() {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const day = useMemo(() => new THREE.Color("#6f86b8"), []);
  const dusk = useMemo(() => new THREE.Color("#33305e"), []);
  const night = useMemo(() => new THREE.Color("#0c1230"), []);

  useFrame((s) => {
    const t = (s.clock.elapsedTime / 200) % 1;
    const daylight = THREE.MathUtils.clamp(Math.sin(t * Math.PI * 2) * 1.2 + 0.2, 0, 1);
    tmpColor.copy(night).lerp(dusk, THREE.MathUtils.clamp(daylight * 2, 0, 1));
    if (daylight > 0.5) tmpColor.lerp(day, (daylight - 0.5) * 2);
    if (mat.current) mat.current.color.copy(tmpColor);
  });

  return (
    <mesh position={[-1, 4.2, -6.1]}>
      <planeGeometry args={[4.8, 3.8]} />
      <meshBasicMaterial ref={mat} color="#33305e" toneMapped={false} fog={false} />
    </mesh>
  );
}

function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const drops = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, () => ({
        x: THREE.MathUtils.lerp(WIN.x0, WIN.x1, Math.random()),
        y: THREE.MathUtils.lerp(WIN.y0, WIN.y1, Math.random()),
        speed: 6 + Math.random() * 6,
        len: 0.22 + Math.random() * 0.35,
      })),
    [],
  );

  useFrame((_, dt) => {
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.speed * dt;
      if (d.y < WIN.y0) {
        d.y = WIN.y1;
        d.x = THREE.MathUtils.lerp(WIN.x0, WIN.x1, Math.random());
      }
      dummy.position.set(d.x, d.y, WIN.z);
      dummy.scale.set(1, d.len, 1);
      dummy.rotation.set(0, 0, 0.1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RAIN_COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.02, 1, 0.02]} />
      <meshBasicMaterial color="#aac6e6" transparent opacity={0.55} fog={false} />
    </instancedMesh>
  );
}

/* ----------------------------------------------------------- Desk props */

function Lamp() {
  const light = useRef<THREE.PointLight>(null!);
  const bulb = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((s) => {
    const f = 1 + Math.sin(s.clock.elapsedTime * 11) * 0.04 + Math.sin(s.clock.elapsedTime * 3) * 0.03;
    if (light.current) light.current.intensity = 9 * f;
    if (bulb.current) bulb.current.emissiveIntensity = 1.6 * f;
  });
  return (
    <group position={[2, 2.05, -4.2]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.1, 1.4, 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.4, 1.4, 0.2]} rotation={[0.5, 0, 0.6]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.8, 1.7, 0.5]} rotation={[0.6, 0, 0.5]}>
        <coneGeometry args={[0.42, 0.5, 16, 1, true]} />
        <meshStandardMaterial color="#e7a23c" side={THREE.DoubleSide} roughness={0.5} />
      </mesh>
      <pointLight ref={light} position={[-0.8, 1.55, 0.6]} color="#ffb65a" intensity={9} distance={13} decay={2} />
      <mesh position={[-0.8, 1.55, 0.6]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial ref={bulb} color="#ffd9a0" emissive="#ffb65a" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RecordPlayer({ analyser }: { analyser: AnalyserNode }) {
  const disc = useRef<THREE.Mesh>(null!);
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const spin = useRef(0);
  useFrame((_, dt) => {
    const { bass } = sampleBands(analyser, freq);
    const playing = usePlayer.getState().isPlaying;
    spin.current = damp(spin.current, playing ? 1.4 + bass * 4 : 0, 3, dt);
    if (disc.current) disc.current.rotation.y += spin.current * dt;
  });
  return (
    <group position={[-3.4, 2.05, -4.3]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[2, 0.16, 1.6]} />
        <meshStandardMaterial color="#1c1a1f" roughness={0.5} />
      </mesh>
      <mesh ref={disc} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.06, 32]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
        <meshStandardMaterial color="#c64f3a" />
      </mesh>
      <mesh position={[0.7, 0.2, -0.6]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.05]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

const EQ_BARS = 12;

function DeskVisualizer({ analyser }: { analyser: AnalyserNode }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  const heights = useRef<number[]>(new Array(EQ_BARS).fill(0.05));
  const colors = useMemo(
    () => Array.from({ length: EQ_BARS }, (_, i) => new THREE.Color().setHSL(0.55 - (i / EQ_BARS) * 0.5, 0.7, 0.55)),
    [],
  );

  useFrame((_, dt) => {
    analyser.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
    const usable = Math.floor(freq.length * 0.45);
    const per = Math.max(1, Math.floor(usable / EQ_BARS));
    const startX = -((EQ_BARS - 1) * 0.26) / 2;
    for (let i = 0; i < EQ_BARS; i++) {
      let sum = 0;
      for (let j = 0; j < per; j++) sum += freq[i * per + j] ?? 0;
      const v = sum / per / 255;
      heights.current[i] = damp(heights.current[i], 0.05 + v * 1.3, 18, dt);
      const h = heights.current[i];
      dummy.position.set(0.6 + startX + i * 0.26, 2.12 + h / 2, -3.7);
      dummy.scale.set(0.18, h, 0.05);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(colors[i]).multiplyScalar(0.5 + v * 2);
      ref.current.setColorAt(i, tmpColor);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, EQ_BARS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
    </instancedMesh>
  );
}

function Desk() {
  return (
    <group>
      <mesh position={[-1, 2, -4]} receiveShadow>
        <boxGeometry args={[8.5, 0.16, 2.4]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.7} />
      </mesh>
      {[
        [-5, -4.9],
        [3, -4.9],
        [-5, -3.1],
        [3, -3.1],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1, z]}>
          <boxGeometry args={[0.18, 2, 0.18]} />
          <meshStandardMaterial color="#3a281a" />
        </mesh>
      ))}
      {/* mug */}
      <mesh position={[0.4, 2.2, -3.6]}>
        <cylinderGeometry args={[0.16, 0.13, 0.32, 16]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.6} />
      </mesh>
      {/* plant */}
      <group position={[-4.6, 2.2, -3.7]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.14, 0.28, 12]} />
          <meshStandardMaterial color="#b5562f" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <icosahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#3f7d3a" flatShading roughness={1} />
        </mesh>
      </group>
    </group>
  );
}

const DUST = 60;
function Dust() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const motes = useMemo(
    () =>
      Array.from({ length: DUST }, () => ({
        p: new THREE.Vector3((Math.random() - 0.5) * 7 - 1, 1 + Math.random() * 4, -5 + Math.random() * 5),
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    motes.forEach((m, i) => {
      const sc = 0.02 + Math.sin(t * 0.5 + m.phase) * 0.01;
      dummy.position.set(m.p.x + Math.sin(t * 0.2 + m.phase) * 0.3, m.p.y + Math.sin(t * 0.13 + m.phase) * 0.2, m.p.z);
      dummy.scale.setScalar(Math.max(0.004, sc));
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, DUST]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffe6b0" transparent opacity={0.5} fog={false} />
    </instancedMesh>
  );
}

/* --------------------------------------------------------- Float + camera */

function FloatingRoom({ analyser }: ThemeSceneProps) {
  const group = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    group.current.position.set(0.7, -1.2 + Math.sin(t * 0.6) * 0.2, 0.7);
    group.current.rotation.y = Math.sin(t * 0.2) * 0.05;
  });
  return (
    <group ref={group} scale={0.72} position={[0.7, -1.2, 0.7]}>
      <RoomShell />
      <WindowSky />
      <Rain />
      <Desk />
      <RecordPlayer analyser={analyser} />
      <DeskVisualizer analyser={analyser} />
      <Lamp />
      <Dust />
    </group>
  );
}

function CameraRig() {
  useFrame((s) => {
    s.camera.position.set(12, 9, 12);
    s.camera.lookAt(0, 0.8, 0);
  });
  return null;
}

export default function LofiScene({ analyser }: ThemeSceneProps) {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.34} color="#9fb6e0" />
      <hemisphereLight args={["#cdd8ff", "#2a1f1a", 0.3]} />
      <directionalLight position={[6, 10, 8]} intensity={0.5} color="#ffd9b0" />
      <FloatingRoom analyser={analyser} />

      {/* Diegetic controls — billboarded so they always face the camera. */}
      <Billboard position={[0, -2.6, 3]}>
        <NowPlayingSign variant="lofi" width={2.6} position={[0, 0.95, 0]} />
        <TransportCluster body="#26222e" icon="#7fe3ff" size={0.5} position={[0, -0.3, 0]} />
      </Billboard>
    </>
  );
}
