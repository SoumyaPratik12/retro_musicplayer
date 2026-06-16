import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../../store/usePlayer";
import { next, prev, togglePlay } from "../../audio/controls";

/* ------------------------------------------------------------- Icons */

const playShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.13, -0.16);
  s.lineTo(0.17, 0);
  s.lineTo(-0.13, 0.16);
  s.closePath();
  return s;
})();

function IconMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} toneMapped={false} />;
}

function PlayIcon({ color }: { color: string }) {
  return (
    <mesh position={[0.02, 0, 0]}>
      <shapeGeometry args={[playShape]} />
      <IconMaterial color={color} />
    </mesh>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[-0.08, 0, 0]}>
        <boxGeometry args={[0.09, 0.32, 0.04]} />
        <IconMaterial color={color} />
      </mesh>
      <mesh position={[0.08, 0, 0]}>
        <boxGeometry args={[0.09, 0.32, 0.04]} />
        <IconMaterial color={color} />
      </mesh>
    </group>
  );
}

function SkipIcon({ color, dir }: { color: string; dir: 1 | -1 }) {
  return (
    <group scale={[dir, 1, 1]}>
      <mesh position={[-0.12, 0, 0]} scale={0.8}>
        <shapeGeometry args={[playShape]} />
        <IconMaterial color={color} />
      </mesh>
      <mesh position={[0.08, 0, 0]} scale={0.8}>
        <shapeGeometry args={[playShape]} />
        <IconMaterial color={color} />
      </mesh>
      <mesh position={[0.16, 0, 0]}>
        <boxGeometry args={[0.06, 0.26, 0.04]} />
        <IconMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------- Button3D */

interface Button3DProps {
  position?: [number, number, number];
  size?: number;
  body: string;
  onClick: () => void;
  children: ReactNode;
}

function Button3D({ position = [0, 0, 0], size = 0.7, body, onClick, children }: Button3DProps) {
  const ref = useRef<THREE.Group>(null!);
  const [hover, setHover] = useState(false);

  useFrame((_, dt) => {
    const target = hover ? 1.14 : 1;
    const s = THREE.MathUtils.damp(ref.current.scale.x, target, 14, dt);
    ref.current.scale.setScalar(s);
  });

  useEffect(() => () => void (document.body.style.cursor = "auto"), []);

  return (
    <group position={position}>
      <group
        ref={ref}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <mesh>
          <boxGeometry args={[size, size, size * 0.45]} />
          <meshStandardMaterial color={body} roughness={0.55} metalness={0.15} />
        </mesh>
        <group position={[0, 0, size * 0.25]}>{children}</group>
      </group>
    </group>
  );
}

/* ----------------------------------------------------- TransportCluster */

interface ClusterProps {
  body: string;
  icon: string;
  size?: number;
  position?: [number, number, number];
}

/** Prev / Play-Pause / Next, themed via colors. Clickable in-world. */
export function TransportCluster({ body, icon, size = 0.6, position = [0, 0, 0] }: ClusterProps) {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const gap = size * 1.45;
  return (
    <group position={position}>
      <Button3D position={[-gap, 0, 0]} size={size} body={body} onClick={() => void prev()}>
        <SkipIcon color={icon} dir={-1} />
      </Button3D>
      <Button3D position={[0, 0, 0]} size={size * 1.12} body={body} onClick={() => void togglePlay()}>
        {isPlaying ? <PauseIcon color={icon} /> : <PlayIcon color={icon} />}
      </Button3D>
      <Button3D position={[gap, 0, 0]} size={size} body={body} onClick={() => void next()}>
        <SkipIcon color={icon} dir={1} />
      </Button3D>
    </group>
  );
}

/* --------------------------------------------------- Now-playing sign */

export type SignVariant = "minecraft" | "lofi" | "cyberpunk" | "vaporwave";

function makeTextTexture(title: string, artist: string, variant: SignVariant): THREE.CanvasTexture {
  const W = 512;
  const H = 192;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Fonts use only web-safe families so they render correctly without any
  // external font being loaded.
  const titleFont =
    variant === "minecraft" ? '700 46px "Courier New", monospace'
    : variant === "cyberpunk" ? '900 46px Arial, sans-serif'
    : variant === "vaporwave" ? 'italic 800 46px Arial, sans-serif'
    : '600 46px "Helvetica Neue", sans-serif';
  const artistFont =
    variant === "minecraft" ? '400 30px "Courier New", monospace'
    : variant === "cyberpunk" ? '700 28px Arial, sans-serif'
    : variant === "vaporwave" ? 'italic 400 30px Arial, sans-serif'
    : '400 30px "Helvetica Neue", sans-serif';
  const titleColor =
    variant === "minecraft" ? "#fdf6c8"
    : variant === "cyberpunk" ? "#00f2ff"
    : variant === "vaporwave" ? "#ffffff"
    : "#eaf2ff";
  const artistColor =
    variant === "minecraft" ? "#9fe07a"
    : variant === "cyberpunk" ? "#ff007b"
    : variant === "vaporwave" ? "#74e1ff"
    : "#8fd0ff";

  const clip = (s: string, max: number) => {
    ctx.font = titleFont;
    if (ctx.measureText(s).width <= max) return s;
    let out = s;
    while (out.length > 1 && ctx.measureText(out + "…").width > max) out = out.slice(0, -1);
    return out + "…";
  };

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.font = titleFont;
  ctx.fillStyle = titleColor;
  ctx.fillText(clip(title || "Nothing playing", W - 40), W / 2, artist ? H / 2 - 22 : H / 2);

  if (artist) {
    ctx.font = artistFont;
    ctx.fillStyle = artistColor;
    ctx.fillText(clip(artist, W - 60), W / 2, H / 2 + 30);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

interface SignProps {
  variant: SignVariant;
  width?: number;
  position?: [number, number, number];
}

export function NowPlayingSign({ variant, width = 2.6, position = [0, 0, 0] }: SignProps) {
  const title = usePlayer((s) => {
    const t = s.tracks[s.currentIndex];
    return t ? t.title || t.fileName.replace(/\.[^.]+$/, "") : "";
  });
  const artist = usePlayer((s) => s.tracks[s.currentIndex]?.artist || "");

  const tex = useMemo(() => makeTextTexture(title, artist, variant), [title, artist, variant]);
  useEffect(() => () => tex.dispose(), [tex]);

  const aspect = 192 / 512;
  const h = width * aspect;

  return (
    <group position={position}>
      {/* themed backing board */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[width * 1.06, h * 1.28, 0.08]} />
        {variant === "minecraft" ? (
          <meshStandardMaterial color="#6b4a2b" roughness={0.9} />
        ) : variant === "cyberpunk" ? (
          <meshStandardMaterial color="#050510" roughness={0.2} metalness={0.9} emissive="#001a1a" emissiveIntensity={0.5} />
        ) : variant === "vaporwave" ? (
          <meshStandardMaterial color="#350042" roughness={0.2} metalness={0.6} emissive="#1a001a" emissiveIntensity={0.5} />
        ) : (
          <meshStandardMaterial color="#15131b" roughness={0.5} metalness={0.3} emissive="#0a1820" emissiveIntensity={0.4} />
        )}
      </mesh>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
