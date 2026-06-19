import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { FILLER_BOTS, type FillerBotDef } from "./cityData";
import { cityEvents } from "./cityEvents";

/* Diverse skin and hair pools for human variety */
const SKIN_POOL = ["#fcd9b0", "#f0b98c", "#d08b5b", "#c47c5a", "#8d5524", "#3d2316"];
const HAIR_POOL = ["#1a0a00", "#3b1f0a", "#5c3317", "#8b4513", "#d4a017", "#c0c0c0", "#111111"];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Build a simple but human-looking character directly on a THREE.Group */
function buildHumanBot(color: string, seed: number, group: THREE.Group): void {
  const skin = SKIN_POOL[seed % SKIN_POOL.length]!;
  const hair = HAIR_POOL[(seed >> 2) % HAIR_POOL.length]!;

  const mat = (c: string, emissive = c, ei = 0) =>
    new THREE.MeshStandardMaterial({ color: c, emissive, emissiveIntensity: ei, roughness: 0.65, metalness: 0.08 });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  /* Shoes */
  add(new THREE.BoxGeometry(0.17, 0.09, 0.28), mat("#111827"), -0.12, 0.05, 0.04);
  add(new THREE.BoxGeometry(0.17, 0.09, 0.28), mat("#111827"),  0.12, 0.05, 0.04);
  /* Lower legs */
  add(new THREE.CylinderGeometry(0.075, 0.065, 0.52, 8), mat(color), -0.12, 0.36, 0);
  add(new THREE.CylinderGeometry(0.075, 0.065, 0.52, 8), mat(color),  0.12, 0.36, 0);
  /* Upper legs */
  add(new THREE.CylinderGeometry(0.095, 0.075, 0.46, 8), mat(color), -0.11, 0.78, 0);
  add(new THREE.CylinderGeometry(0.095, 0.075, 0.46, 8), mat(color),  0.11, 0.78, 0);
  /* Torso */
  add(new THREE.CylinderGeometry(0.20, 0.17, 0.52, 8), mat(color), 0, 1.28, 0);
  /* Chest accent */
  add(new THREE.BoxGeometry(0.22, 0.10, 0.05), mat(color, color, 0.2), 0, 1.33, 0.19);
  /* Left arm */
  add(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 8), mat(color), -0.27, 1.16, 0, 0, 0,  0.18);
  /* Right arm */
  add(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 8), mat(color),  0.27, 1.16, 0, 0, 0, -0.18);
  /* Left hand */
  add(new THREE.SphereGeometry(0.065, 7, 6), mat(skin), -0.30, 0.90, 0);
  /* Right hand */
  add(new THREE.SphereGeometry(0.065, 7, 6), mat(skin),  0.30, 0.90, 0);
  /* Neck */
  add(new THREE.CylinderGeometry(0.09, 0.10, 0.18, 8), mat(skin), 0, 1.62, 0);
  /* Head */
  add(new THREE.SphereGeometry(0.27, 14, 12), mat(skin), 0, 2.02, 0);
  /* Eye whites */
  add(new THREE.SphereGeometry(0.058, 7, 6), mat("#ffffff"), -0.092, 2.04, 0.23);
  add(new THREE.SphereGeometry(0.058, 7, 6), mat("#ffffff"),  0.092, 2.04, 0.23);
  /* Irises */
  add(new THREE.SphereGeometry(0.036, 7, 6), mat("#1a3a6b"), -0.092, 2.04, 0.252);
  add(new THREE.SphereGeometry(0.036, 7, 6), mat("#1a3a6b"),  0.092, 2.04, 0.252);
  /* Pupils */
  add(new THREE.SphereGeometry(0.020, 6, 5), mat("#000000"), -0.092, 2.04, 0.262);
  add(new THREE.SphereGeometry(0.020, 6, 5), mat("#000000"),  0.092, 2.04, 0.262);
  /* Nose */
  add(new THREE.ConeGeometry(0.026, 0.055, 5), mat(skin), 0, 1.99, 0.27, -Math.PI / 2, 0, 0);
  /* Smile */
  add(new THREE.TorusGeometry(0.055, 0.014, 5, 8, Math.PI), mat("#c0392b"), 0, 1.88, 0.25, Math.PI, 0, 0);
  /* Ears */
  add(new THREE.SphereGeometry(0.052, 7, 6), mat(skin), -0.275, 2.02, 0);
  add(new THREE.SphereGeometry(0.052, 7, 6), mat(skin),  0.275, 2.02, 0);
  /* Hair */
  add(new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(hair), 0, 2.10, 0);
  /* Hair tuft */
  add(new THREE.BoxGeometry(0.30, 0.08, 0.14), mat(hair), 0, 2.25, 0.17);
}

function FillerBotMesh({ bot }: { bot: FillerBotDef }) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const hoverRingRef = useRef<THREE.Mesh>(null!);
  const progressRef = useRef(Math.random());
  const segmentRef = useRef(Math.floor(Math.random() * bot.patrol.length));
  const hoveredRef = useRef(false);
  const walkTimeRef = useRef(Math.random() * Math.PI * 2);
  const SPEED = 0.7 + (bot.id.charCodeAt(4) % 5) * 0.12;
  const seed = hashCode(bot.id);

  const patrolPoints = useMemo(
    () => bot.patrol.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    [bot.patrol],
  );

  useEffect(() => {
    const grp = bodyRef.current;
    if (!grp) return;
    while (grp.children.length) grp.remove(grp.children[0]);
    buildHumanBot(bot.color, seed, grp);
  }, [bot, seed]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const seg = segmentRef.current % patrolPoints.length;
    const from = patrolPoints[seg]!;
    const to = patrolPoints[(seg + 1) % patrolPoints.length]!;

    progressRef.current += (dt * SPEED) / from.distanceTo(to);
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      segmentRef.current = (segmentRef.current + 1) % patrolPoints.length;
    }

    const pos = new THREE.Vector3().lerpVectors(from, to, progressRef.current);
    walkTimeRef.current += dt;

    // Walking bob
    const bob = Math.sin(walkTimeRef.current * 6.5) * 0.09;
    groupRef.current.position.set(pos.x, bob, pos.z);

    const dir = to.clone().sub(from);
    if (dir.length() > 0.01) {
      groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Leg swing animation
    if (bodyRef.current && bodyRef.current.children.length >= 6) {
      const c = bodyRef.current.children;
      const swing = Math.sin(walkTimeRef.current * 6.5) * 0.38;
      // indices 2,3 lower legs; 4,5 upper legs
      if (c[2]) c[2].rotation.x =  swing * 0.5;
      if (c[3]) c[3].rotation.x = -swing * 0.5;
      if (c[4]) c[4].rotation.x = -swing * 0.5;
      if (c[5]) c[5].rotation.x =  swing * 0.5;
      // indices 8,9 = arms
      if (c[8]) c[8].rotation.z =  swing * 0.3 + 0.18;
      if (c[9]) c[9].rotation.z = -swing * 0.3 - 0.18;
    }

    if (hoverRingRef.current) {
      const target = hoveredRef.current ? 0.8 : 0.15;
      (hoverRingRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
        (hoverRingRef.current.material as THREE.MeshBasicMaterial).opacity,
        target,
        dt * 8,
      );
    }
  });

  const startX = bot.patrol[0]?.[0] ?? 0;
  const startZ = bot.patrol[0]?.[1] ?? 0;

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    cityEvents.emitBotFact({ name: bot.name, fact: bot.careerFact, color: bot.color, district: bot.district });
  };
  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    hoveredRef.current = true;
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    hoveredRef.current = false;
    document.body.style.cursor = "";
  };

  return (
    <group
      ref={groupRef}
      position={[startX, 0, startZ]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Hover glow ring */}
      <mesh ref={hoverRingRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.58, 24]} />
        <meshBasicMaterial color={bot.color} transparent opacity={0.15} />
      </mesh>
      {/* Shadow ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.40, 20]} />
        <meshBasicMaterial color={bot.color} transparent opacity={0.22} />
      </mesh>

      {/* Human body */}
      <group ref={bodyRef} />

      {/* Name tag */}
      <Billboard position={[0, 3.1, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <mesh>
          <planeGeometry args={[2.0, 0.55]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.55} />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.27} color={bot.color} anchorX="center" anchorY="middle">
          {bot.name}
        </Text>
      </Billboard>
    </group>
  );
}

export default function FillerBots() {
  return (
    <group>
      {FILLER_BOTS.map(bot => (
        <FillerBotMesh key={bot.id} bot={bot} />
      ))}
    </group>
  );
}
