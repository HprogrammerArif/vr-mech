import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { Cloud, Environment } from "@react-three/drei";
import * as THREE from "three";
import Districts from "./Districts";
import NPCCharacter from "./NPCCharacter";
import PlayerController from "./PlayerController";
import CityAvatars from "./CityAvatars";
import CityDecorations from "./CityDecorations";
import FillerBots from "./FillerBots";
import type { CharacterColors } from "./FortniteCharacter";
import { NPCS, type NPCDef } from "./cityData";
import type { BuildingDef } from "./cityData";
import { DNState, CYCLE_SECONDS, getDayFactor, getSunPos } from "./dayNight";

/* ══════════════════════════════════════════
   Dynamic scene lighting — drives day/night
═══════════════════════════════════════════ */
function SceneLighting() {
  const ambRef = useRef<THREE.AmbientLight>(null!);
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  const fillRef = useRef<THREE.DirectionalLight>(null!);
  const hemiRef = useRef<THREE.HemisphereLight>(null!);

  useFrame((_, dt) => {
    DNState.time = (DNState.time + dt / CYCLE_SECONDS) % 1;
    const day = getDayFactor();

    if (ambRef.current) {
      ambRef.current.intensity = THREE.MathUtils.lerp(0.18, 1.6, day);
      const r = Math.floor(THREE.MathUtils.lerp(20, 212, day));
      const g = Math.floor(THREE.MathUtils.lerp(30, 232, day));
      const b = Math.floor(THREE.MathUtils.lerp(80, 255, day));
      ambRef.current.color.setRGB(r / 255, g / 255, b / 255);
    }

    if (sunRef.current) {
      const [sx, sy, sz] = getSunPos();
      sunRef.current.position.set(sx, sy, sz);
      sunRef.current.intensity = day * 2.5;
      // Warm orange at dawn/dusk, white at noon
      const warmth = Math.max(0, 1 - Math.abs(day - 0.5) * 3);
      sunRef.current.color.setRGB(1, 0.88 + warmth * 0.12, 0.6 + warmth * 0.4);
    }

    if (fillRef.current) {
      fillRef.current.intensity = day * 0.85;
    }

    if (hemiRef.current) {
      hemiRef.current.intensity = 0.12 + day * 0.58;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={1.6} color="#d4e8ff" />
      <directionalLight
        ref={sunRef}
        position={[80, 120, 60]}
        intensity={2.5}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />
      <directionalLight ref={fillRef} position={[-60, 80, -40]} intensity={0.85} color="#b0d4ff" />
      <hemisphereLight ref={hemiRef} args={["#87ceeb", "#1a3a5c", 0.7] as unknown as [THREE.ColorRepresentation, THREE.ColorRepresentation, number]} />
    </>
  );
}

/* ══════════════════════════════════════════
   Animated fountain with water particles
═══════════════════════════════════════════ */
function WaterParticle({ angle, offset }: { angle: number; offset: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.85 + offset) % 1.8;
    const prog = t / 1.8;
    const arc = Math.sin(prog * Math.PI);
    const r = prog * 4.2;
    ref.current.position.x = Math.cos(angle) * r;
    ref.current.position.z = Math.sin(angle) * r;
    ref.current.position.y = 1.8 + arc * 2.5;
    ref.current.scale.setScalar(0.1 + arc * 0.14);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + arc * 0.5;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.18, 5, 4]} />
      <meshBasicMaterial color="#7dd3fc" transparent opacity={0.6} />
    </mesh>
  );
}

function AnimatedFountain() {
  const waterRef = useRef<THREE.Mesh>(null!);
  const spoutRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (waterRef.current) {
      (waterRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.sin(t * 1.8) * 0.25;
    }
    if (spoutRef.current) {
      spoutRef.current.scale.y = 1 + Math.sin(t * 3.2) * 0.18;
      spoutRef.current.position.y = 1.2 + Math.sin(t * 3.2) * 0.05;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5, 6, 1, 32]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh ref={spoutRef} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 16]} />
        <meshStandardMaterial color="#f5a524" emissive="#f5a524" emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={waterRef} position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.5, 32]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0369a1" emissiveIntensity={0.5} transparent opacity={0.78} roughness={0.1} metalness={0.5} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <WaterParticle key={i} angle={(i / 8) * Math.PI * 2} offset={i * 0.35} />
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════
   Static city ground + roads
═══════════════════════════════════════════ */
function CityGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#152438" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[25, 48]} />
        <meshStandardMaterial color="#1c3050" roughness={0.65} metalness={0.15} />
      </mesh>
      {[30, 60, 90].map((r, i) => (
        <mesh key={i} position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 1.5, 64]} />
          <meshStandardMaterial color="#1e3550" roughness={1} />
        </mesh>
      ))}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.sin(rad) * 65, -0.04, Math.cos(rad) * 65]} rotation={[-Math.PI / 2, 0, rad]}>
            <planeGeometry args={[4, 100]} />
            <meshStandardMaterial color="#1e3550" roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════
   Street lights — flanking roads, not on them
═══════════════════════════════════════════ */
function StreetLights() {
  const positions: [number, number, number][] = [];
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    // Perpendicular offset (right side of road when walking outward)
    const perpX = Math.cos(rad) * 3.2;
    const perpZ = -Math.sin(rad) * 3.2;
    for (const r of [22, 45, 70]) {
      const cx = Math.sin(rad) * r;
      const cz = Math.cos(rad) * r;
      positions.push([cx + perpX, 0, cz + perpZ]);
    }
  }
  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 7, 6]} />
            <meshStandardMaterial color="#1e3a5f" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 7.2, 0]}>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, 7, 0]} intensity={7} distance={22} color="#fef3c7" decay={2} />
        </group>
      ))}
    </group>
  );
}


export type CitySceneProps = {
  playerName: string;
  playerColor: string;
  playerColors?: CharacterColors;
  socketId: string;
  onEnterBuilding: (b: BuildingDef) => void;
  onNPCChat: (npc: NPCDef) => void;
  onPositionChange: (x: number, z: number) => void;
};

const DEFAULT_COLORS: CharacterColors = {
  skinTone: "#fcd9b0",
  hairColor: "#1a0a00",
  outfitColor: "#f5a524",
  accentColor: "#ea580c",
};

function CityScene({ playerName, playerColor, playerColors, socketId, onEnterBuilding, onNPCChat, onPositionChange }: CitySceneProps) {
  const colors = playerColors ?? { ...DEFAULT_COLORS, outfitColor: playerColor, accentColor: playerColor };

  return (
    <>
      <SceneLighting />
      <Environment preset="city" />
      <Cloud position={[0, 80, -100]} speed={0.1} opacity={0.3} />
      <Cloud position={[80, 90, 50]} speed={0.07} opacity={0.2} />
      <fog attach="fog" args={["#0d2a4a", 80, 260]} />

      <CityGround />
      <AnimatedFountain />
      <StreetLights />

      <Suspense fallback={null}>
        <CityDecorations />
        <FillerBots />
        <Districts onEnterBuilding={onEnterBuilding} />
        {NPCS.map(npc => (
          <NPCCharacter key={npc.id} npc={npc} onChat={onNPCChat} />
        ))}
        <PlayerController name={playerName} colors={colors} onPositionChange={onPositionChange} />
        <CityAvatars myId={socketId} />
      </Suspense>
    </>
  );
}

export default function CareerCity(props: CitySceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
      camera={{ fov: 65, near: 0.5, far: 600, position: [0, 13, 22] }}
      style={{ width: "100%", height: "100%" }}
      dpr={[1, 1.5]}
    >
      <CityScene {...props} />
    </Canvas>
  );
}
