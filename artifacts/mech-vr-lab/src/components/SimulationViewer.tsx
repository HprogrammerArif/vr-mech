import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, useProgress, Html } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { Maximize2, Minimize2, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import EnvironmentScene from "./scenes/Environments";
import * as THREE from "three";

/* Per-scene environment preset for realistic IBL reflections */
const SCENE_ENV: Record<string, string> = {
  "mech-lab":          "warehouse",
  "construction-site": "sunset",
  "circuit-board":     "night",
  "chem-plant":        "night",
  "factory-floor":     "warehouse",
  "office-desk":       "apartment",
  "hospital-room":     "studio",
  "server-room":       "night",
  "data-viz":          "night",
  "courtroom":         "lobby",
  "kitchen":           "apartment",
  "rooftop-solar":     "sunset",
  "wind-turbine":      "sunset",
  "spa":               "forest",
};

/* Teleportation floor — plain mesh that lets XR teleport work */
function TeleportFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
}

/* Camera rig — smooth dolly into scene on mount */
function CameraIntro() {
  const started = useRef(false);
  useFrame(({ camera }) => {
    if (started.current) return;
    camera.position.lerp(new THREE.Vector3(4, 3, 5.5), 0.04);
    if (camera.position.distanceTo(new THREE.Vector3(4, 3, 5.5)) < 0.1) started.current = true;
  });
  return null;
}

/* Loading overlay */
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-xs uppercase tracking-widest opacity-70">
        Loading {Math.round(progress)}%
      </div>
    </Html>
  );
}

export default function SimulationViewer({
  environment,
  params,
  multiplayerOverlay,
}: {
  environment: string;
  params: Record<string, unknown>;
  multiplayerOverlay?: React.ReactNode;
}) {
  const xrStore = useMemo(() => createXRStore(), []);
  const [expanded, setExpanded] = useState(false);
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const xr = (
      navigator as Navigator & {
        xr?: { isSessionSupported?: (m: string) => Promise<boolean> };
      }
    ).xr;
    if (!xr?.isSessionSupported) { setVrSupported(false); return; }
    xr.isSessionSupported("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 bg-[hsl(217_60%_4%)]"
          : "relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[hsl(217_35%_18%)] bg-gradient-to-br from-[hsl(217_50%_8%)] via-[hsl(217_60%_6%)] to-[hsl(217_70%_4%)]"
      }
      data-testid="simulation-viewer"
    >
      <Canvas
        shadows
        camera={{ position: [8, 5, 10], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        dpr={[1, 2]}
      >
        <XR store={xrStore}>
          <Suspense fallback={<Loader />}>

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[6, 10, 6]}
              intensity={1.4}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={0.5}
              shadow-camera-far={30}
              shadow-camera-left={-10}
              shadow-camera-right={10}
              shadow-camera-top={10}
              shadow-camera-bottom={-10}
            />
            <directionalLight position={[-5, 4, -5]} intensity={0.3} color="#6b9aff" />
            <pointLight position={[-3, 5, -3]} intensity={0.6} color="#f5a524" distance={14} />
            <pointLight position={[4, 2, 4]} intensity={0.35} color="#ffffff" distance={10} />

            {/* Environment preset — per-scene IBL for realistic reflections */}
            <Environment preset={(SCENE_ENV[environment] ?? "night") as Parameters<typeof Environment>[0]["preset"]} />

            {/* Teleport floor for VR movement */}
            <TeleportFloor />

            {/* The actual scene */}
            <EnvironmentScene environment={environment} params={params} />

            {/* Smooth camera intro */}
            <CameraIntro />

            {/* Orbit controls (disabled in XR automatically) */}
            <OrbitControls
              enablePan={false}
              minDistance={2.5}
              maxDistance={18}
              maxPolarAngle={Math.PI / 2 - 0.03}
              target={[0, 1.5, 0]}
            />

            {/* Post-processing */}
            <EffectComposer multisampling={0}>
              <Bloom
                mipmapBlur
                luminanceThreshold={0.45}
                luminanceSmoothing={0.35}
                intensity={1.1}
                radius={0.55}
              />
              <ChromaticAberration
                offset={new THREE.Vector2(0.0008, 0.0008)}
                radialModulation={false}
                modulationOffset={0}
              />
              <Vignette eskil={false} offset={0.3} darkness={0.65} />
            </EffectComposer>

          </Suspense>
        </XR>
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 flex gap-2">
        <Button
          size="sm"
          onClick={() => xrStore.enterVR()}
          data-testid="button-enter-vr"
          disabled={vrSupported === false}
          className="gradient-gold text-[hsl(217_60%_6%)] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            vrSupported === false
              ? "Open this page in a VR-capable browser (Quest, Pico, Chrome with WebXR) to enter VR"
              : "Enter immersive VR mode"
          }
        >
          <Headset className="h-4 w-4 mr-1.5" />
          {vrSupported === null ? "Checking VR…" : vrSupported === false ? "VR unavailable" : "Enter VR"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setExpanded((v) => !v)}
          data-testid="button-expand-scene"
          className="bg-white/90 hover:bg-white text-[hsl(217_60%_6%)] backdrop-blur"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Hint bar */}
      <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-white/60 bg-black/40 backdrop-blur px-2 py-1 rounded-md border border-white/10">
        Drag · Scroll to zoom · Enter VR on headset
      </div>

      {/* Multiplayer overlay (avatars, status) */}
      {multiplayerOverlay}
    </div>
  );
}
