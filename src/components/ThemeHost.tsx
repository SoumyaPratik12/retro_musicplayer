import { Suspense, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as THREE from "three";
import { usePlayer } from "../store/usePlayer";
import { engine } from "../audio/AudioEngine";
import { getTheme } from "../themes/registry";

/**
 * A large invisible plane that always fills the view, behind the scene. Pressing
 * empty space hits it and starts dragging the borderless window — while the 3D
 * control buttons (which sit closer to the camera and stop propagation) stay
 * clickable. This replaces a DOM drag region so the canvas can stay interactive.
 */
function DragBackdrop() {
  const ref = useRef<THREE.Mesh>(null!);
  const dir = useRef(new THREE.Vector3());
  useFrame((s) => {
    s.camera.getWorldDirection(dir.current);
    ref.current.position.copy(s.camera.position).addScaledVector(dir.current, 60);
    ref.current.quaternion.copy(s.camera.quaternion);
  });
  return (
    <mesh
      ref={ref}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (e.button === 0) void getCurrentWindow().startDragging();
      }}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function ThemeHost() {
  const themeId = usePlayer((s) => s.themeId);
  const theme = getTheme(themeId);
  const Scene = theme.Scene;

  return (
    <Canvas
      key={themeId}
      className="scene-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      camera={{ fov: 40, near: 0.1, far: 200, position: [12, 10, 12] }}
    >
      <DragBackdrop />
      <Suspense fallback={null}>
        <Scene analyser={engine.analyser} />
      </Suspense>
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
