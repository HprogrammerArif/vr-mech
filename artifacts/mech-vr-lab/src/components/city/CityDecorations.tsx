import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { getDayFactor } from "./dayNight";
import { BENCH_POSITIONS } from "./cityColliders";

/* ══════════════════════════════════════════
   Tree
═══════════════════════════════════════════ */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 3, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.95} />
      </mesh>
      <mesh position={[0, 4.5, 0]} castShadow>
        <coneGeometry args={[2.2, 5, 7]} />
        <meshStandardMaterial color="#1b5e20" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6.5, 0]} castShadow>
        <coneGeometry args={[1.6, 3.5, 7]} />
        <meshStandardMaterial color="#2e7d32" roughness={0.8} />
      </mesh>
      <mesh position={[0, 8, 0]} castShadow>
        <coneGeometry args={[1.1, 2.5, 7]} />
        <meshStandardMaterial color="#388e3c" roughness={0.75} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════════
   1WayMirror branded sign billboard
═══════════════════════════════════════════ */
function SignBoard({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 10, 8]} />
        <meshStandardMaterial color="#263238" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 10.5, 0.25]} castShadow>
        <boxGeometry args={[0.5, 0.25, 0.8]} />
        <meshStandardMaterial color="#263238" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 12, 0.6]} castShadow>
        <boxGeometry args={[11, 4, 0.3]} />
        <meshStandardMaterial color="#071020" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Thin accent edge strips only — no solid yellow panel */}
      <mesh position={[0, 14.1, 0.44]}>
        <boxGeometry args={[11.5, 0.12, 0.04]} />
        <meshStandardMaterial color="#f5a524" emissive="#f5a524" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 9.9, 0.44]}>
        <boxGeometry args={[11.5, 0.12, 0.04]} />
        <meshStandardMaterial color="#f5a524" emissive="#f5a524" emissiveIntensity={0.8} />
      </mesh>
      <Text position={[0, 12.3, 0.78]} fontSize={1.2} color="#f5a524" anchorX="center" anchorY="middle">
        1WayMirror World
      </Text>
      <Text position={[0, 11.0, 0.78]} fontSize={0.55} color="#94a3b8" anchorX="center" anchorY="middle">
        AI Career Exploration · Explore Your Future
      </Text>
      <pointLight position={[0, 12, 3]} intensity={12} distance={28} color="#f5a524" decay={2} />
    </group>
  );
}

/* ══════════════════════════════════════════
   Digital Billboard — rotating career ads
═══════════════════════════════════════════ */
const AD_SLIDES = [
  { title: "Healthcare Careers", sub: "Nursing · Medicine · Pharmacy · PT", color: "#10b981" },
  { title: "Technology District", sub: "AI · Cybersecurity · Data Science", color: "#8b5cf6" },
  { title: "Trades Earn $90K+", sub: "Electrician · HVAC · Plumbing · Zero Debt", color: "#f97316" },
  { title: "Business & Finance", sub: "Launch startups · Lead Fortune 500 teams", color: "#f5a524" },
  { title: "1WayMirror World", sub: "75+ Career Simulations · Explore Free Today", color: "#3b82f6" },
  { title: "Legal Careers", sub: "Lawyer · Prosecutor · Federal Agent · Judge", color: "#818cf8" },
  { title: "Engineering Path", sub: "Civil · Aerospace · Biomedical · Software", color: "#60a5fa" },
];

function DigitalBillboard({ position, rotation = [0, 0, 0] as [number, number, number], startIdx = 0 }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  startIdx?: number;
}) {
  const [adIdx, setAdIdx] = useState(startIdx % AD_SLIDES.length);
  const screenRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const fadeRef = useRef(1.0);
  const fadingOut = useRef(false);
  const pendingSwitch = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      fadingOut.current = true;
      pendingSwitch.current = true;
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useFrame((_, dt) => {
    if (fadingOut.current) {
      fadeRef.current = Math.max(0, fadeRef.current - dt * 3);
      if (fadeRef.current === 0 && pendingSwitch.current) {
        pendingSwitch.current = false;
        fadingOut.current = false;
        setAdIdx(i => (i + 1) % AD_SLIDES.length);
      }
    } else {
      fadeRef.current = Math.min(1, fadeRef.current + dt * 2.5);
    }
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshBasicMaterial).opacity = fadeRef.current * 0.92;
    }
    if (lightRef.current) {
      lightRef.current.intensity = fadeRef.current * 10;
    }
  });

  const ad = AD_SLIDES[adIdx]!;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 14, 8]} />
        <meshStandardMaterial color="#1b2838" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 14.2, 0.4]}>
        <boxGeometry args={[0.6, 0.3, 1.0]} />
        <meshStandardMaterial color="#1b2838" metalness={0.8} />
      </mesh>
      <mesh position={[0, 16, 0.8]} castShadow>
        <boxGeometry args={[11, 5.5, 0.45]} />
        <meshStandardMaterial color="#070d1a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 16, 0.6]}>
        <boxGeometry args={[11.5, 6.0, 0.06]} />
        <meshStandardMaterial color={ad.color} emissive={ad.color} emissiveIntensity={1.2} transparent opacity={0.7} />
      </mesh>
      <mesh ref={screenRef} position={[0, 16, 1.06]}>
        <planeGeometry args={[10.5, 5.0]} />
        <meshBasicMaterial color="#030810" transparent opacity={0.92} />
      </mesh>
      <Text position={[0, 17.1, 1.08]} fontSize={0.95} color={ad.color} anchorX="center" anchorY="middle">
        {ad.title}
      </Text>
      <Text position={[0, 15.8, 1.08]} fontSize={0.54} color="white" anchorX="center" anchorY="middle">
        {ad.sub}
      </Text>
      <Text position={[0, 14.8, 1.08]} fontSize={0.36} color="#475569" anchorX="center" anchorY="middle">
        1WayMirror.com · Explore Before You Commit
      </Text>
      <pointLight ref={lightRef} position={[0, 16, 3.5]} intensity={10} distance={30} color={ad.color} decay={2} />
    </group>
  );
}

/* ══════════════════════════════════════════
   Park bench — physically solid
═══════════════════════════════════════════ */
function Bench({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat plank */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 0.7]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.8, -0.28]} castShadow>
        <boxGeometry args={[2.2, 0.6, 0.1]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      {/* Legs */}
      {[-0.85, 0.85].map((x, i) => (
        <mesh key={i} position={[x, 0.25, 0.1]} castShadow>
          <boxGeometry args={[0.12, 0.5, 0.7]} />
          <meshStandardMaterial color="#455a64" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════════
   Dynamic lamp post — dims in daytime
═══════════════════════════════════════════ */
function LampPost({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!);
  const bulbRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const day = getDayFactor();
    const nightFactor = 1 - day;
    if (lightRef.current) {
      lightRef.current.intensity = 2 + nightFactor * 28;
    }
    if (bulbRef.current) {
      (bulbRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + nightFactor * 4;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 8, 8]} />
        <meshStandardMaterial color="#263238" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh ref={bulbRef} position={[0.6, 8.1, 0]}>
        <sphereGeometry args={[0.35, 10, 8]} />
        <meshStandardMaterial color="#fffde7" emissive="#ffe082" emissiveIntensity={3.0} roughness={0.1} />
      </mesh>
      <pointLight ref={lightRef} position={[0.6, 8.1, 0]} intensity={18} distance={35} color="#ffe082" decay={2} />
    </group>
  );
}

/* ══════════════════════════════════════════
   Scatter layout data
═══════════════════════════════════════════ */
const TREES: Array<{ pos: [number, number, number]; scale: number }> = [
  { pos: [18, 0, -4], scale: 0.9 }, { pos: [22, 0, 8], scale: 1.1 }, { pos: [-18, 0, 4], scale: 1.0 },
  { pos: [-22, 0, -6], scale: 0.85 }, { pos: [6, 0, -22], scale: 1.0 }, { pos: [-6, 0, 22], scale: 0.95 },
  { pos: [14, 0, 16], scale: 0.9 }, { pos: [-14, 0, -16], scale: 1.05 },
  { pos: [-44, 0, -30], scale: 1.2 }, { pos: [-40, 0, -22], scale: 0.9 }, { pos: [-38, 0, -36], scale: 1.0 },
  { pos: [44, 0, -30], scale: 1.1 }, { pos: [40, 0, -22], scale: 0.9 }, { pos: [38, 0, -36], scale: 1.0 },
  { pos: [5, 0, -44], scale: 1.0 }, { pos: [12, 0, -40], scale: 0.85 }, { pos: [-9, 0, -40], scale: 1.1 },
  { pos: [44, 0, 30], scale: 1.0 }, { pos: [40, 0, 22], scale: 0.9 }, { pos: [-44, 0, 30], scale: 1.1 },
  { pos: [-40, 0, 22], scale: 0.9 }, { pos: [-5, 0, 44], scale: 1.0 }, { pos: [9, 0, 42], scale: 0.85 },
  { pos: [-9, 0, 40], scale: 1.1 },
  { pos: [32, 0, 4], scale: 0.8 }, { pos: [-32, 0, -4], scale: 0.8 },
  { pos: [4, 0, 32], scale: 0.8 }, { pos: [-4, 0, -32], scale: 0.8 },
  { pos: [22, 0, -20], scale: 0.88 }, { pos: [-22, 0, -20], scale: 0.88 },
  { pos: [22, 0, 20], scale: 0.88 }, { pos: [-22, 0, 20], scale: 0.88 },
];

const BRANDED_BILLBOARDS: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  { pos: [0, 0, -30], rot: [0, Math.PI, 0] },
  { pos: [0, 0, 30], rot: [0, 0, 0] },
];

const DIGITAL_BILLBOARDS: Array<{ pos: [number, number, number]; rot: [number, number, number]; startIdx: number }> = [
  { pos: [29, 0, 17], rot: [0, -Math.PI * 0.67, 0], startIdx: 0 },
  { pos: [29, 0, -17], rot: [0, -Math.PI * 0.33, 0], startIdx: 2 },
  { pos: [-29, 0, 17], rot: [0, Math.PI * 0.67, 0], startIdx: 4 },
  { pos: [-29, 0, -17], rot: [0, Math.PI * 0.33, 0], startIdx: 1 },
];

const LAMPS: Array<[number, number, number]> = [
  // Inner plaza corners — between roads, clearly off paving
  [14, 0, -10], [-14, 0, 10], [14, 0, 10], [-14, 0, -10],
  // Mid-ring — flanking roads at ~25-unit radius
  [26, 0, -10], [-26, 0, 10], [10, 0, 26], [-10, 0, -26],
  // Outer ring — flanking roads at ~35-unit radius
  [37, 0, 6], [-37, 0, -6], [6, 0, 37], [-6, 0, -37],
];

export default function CityDecorations() {
  return (
    <group>
      {TREES.map((t, i) => <Tree key={`tree-${i}`} position={t.pos} scale={t.scale} />)}
      {BRANDED_BILLBOARDS.map((b, i) => <SignBoard key={`sign-${i}`} position={b.pos} rotation={b.rot} />)}
      {DIGITAL_BILLBOARDS.map((b, i) => (
        <DigitalBillboard key={`digi-${i}`} position={b.pos} rotation={b.rot} startIdx={b.startIdx} />
      ))}
      {BENCH_POSITIONS.map((b, i) => <Bench key={`bench-${i}`} position={b.pos} rotation={b.rot} />)}
      {LAMPS.map((p, i) => <LampPost key={`lamp-${i}`} position={p} />)}
    </group>
  );
}
