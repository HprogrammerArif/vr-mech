import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import type { NPCDef } from "./cityData";
import { buildFortniteCharacter, type CharacterColors } from "./FortniteCharacter";

/* NPC color palettes mapped to role */
const ROLE_PALETTES: Record<string, CharacterColors> = {
  professional: { skinTone: "#fcd9b0", hairColor: "#1a0a00", outfitColor: "#1d4ed8", accentColor: "#60a5fa" },
  mentor:       { skinTone: "#d08b5b", hairColor: "#3b1f0a", outfitColor: "#7c3aed", accentColor: "#c4b5fd" },
  student:      { skinTone: "#8d5524", hairColor: "#1a0a00", outfitColor: "#16a34a", accentColor: "#4ade80" },
  recruiter:    { skinTone: "#f0b98c", hairColor: "#5c3317", outfitColor: "#0891b2", accentColor: "#22d3ee" },
  counselor:    { skinTone: "#c47c5a", hairColor: "#1a0a00", outfitColor: "#ea580c", accentColor: "#fb923c" },
  alumni:       { skinTone: "#3d2316", hairColor: "#1a0a00", outfitColor: "#be185d", accentColor: "#f472b6" },
};

/* Unique palette variation by NPC id */
const SKIN_POOL = ["#fcd9b0", "#f0b98c", "#d08b5b", "#c47c5a", "#8d5524", "#3d2316"];
const HAIR_POOL = ["#1a0a00", "#3b1f0a", "#5c3317", "#8b4513", "#d4a017", "#d0d0d0"];

function npcColors(npc: NPCDef): CharacterColors {
  const base = ROLE_PALETTES[npc.role] ?? ROLE_PALETTES.professional;
  let h = 0;
  for (let i = 0; i < npc.id.length; i++) h = (h * 31 + npc.id.charCodeAt(i)) & 0xffffffff;
  return {
    skinTone: SKIN_POOL[Math.abs(h) % SKIN_POOL.length],
    hairColor: HAIR_POOL[Math.abs(h >> 4) % HAIR_POOL.length],
    outfitColor: base.outfitColor,
    accentColor: base.accentColor,
  };
}

const ROLE_ICONS: Record<string, string> = {
  professional: "💼", mentor: "🎓", student: "📚",
  recruiter: "🤝", counselor: "💡", alumni: "⭐",
};

function NPCBody({ npc, hovered }: { npc: NPCDef; hovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!groupRef.current) return;
    // Clear old children
    while (groupRef.current.children.length) groupRef.current.remove(groupRef.current.children[0]);
    buildFortniteCharacter(npcColors(npc), groupRef.current);
  }, [npc]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = hovered ? 0.35 : m.emissiveIntensity > 0 ? m.emissiveIntensity : 0;
      }
    });
  }, [hovered]);

  return (
    <>
      <group ref={groupRef} />
      {/* Ground glow ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshBasicMaterial color={npc.color} transparent opacity={hovered ? 0.9 : 0.4} />
      </mesh>
    </>
  );
}

export default function NPCCharacter({ npc, onChat }: { npc: NPCDef; onChat: (n: NPCDef) => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const targetRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(npc.patrol[0][0], 0, npc.patrol[0][1]));
  const [hovered, setHovered] = useState(false);
  const walkPhase = useRef(0);

  useFrame((_, dt) => {
    const patrol = npc.patrol;
    const target = patrol[targetRef.current];
    const pos = posRef.current;
    const dx = target[0] - pos.x;
    const dz = target[1] - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      targetRef.current = (targetRef.current + 1) % patrol.length;
    } else {
      const speed = 3.5 * dt;
      pos.x += (dx / dist) * speed;
      pos.z += (dz / dist) * speed;
      walkPhase.current += dt * 8;
    }

    groupRef.current.position.set(pos.x, 0, pos.z);
    if (dist > 0.1) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        Math.atan2(dx, dz),
        dt * 6,
      );
    }
  });

  return (
    <group ref={groupRef} position={[npc.patrol[0][0], 0, npc.patrol[0][1]]}>
      <group
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); onChat(npc); }}
      >
        <NPCBody npc={npc} hovered={hovered} />
      </group>

      {/* Holographic name plate */}
      <Billboard position={[0, 4.6, 0]}>
        {/* BG pill */}
        <mesh>
          <planeGeometry args={[3.8, 1.1]} />
          <meshBasicMaterial color="#050d1e" transparent opacity={0.82} />
        </mesh>
        {/* Colored border */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[3.84, 1.14]} />
          <meshBasicMaterial color={npc.color} transparent opacity={0.3} />
        </mesh>
        <Text position={[0, 0.24, 0.01]} fontSize={0.44} color={npc.color} anchorX="center" anchorY="middle">
          {ROLE_ICONS[npc.role]} {npc.name}
        </Text>
        <Text position={[0, -0.24, 0.01]} fontSize={0.29} color="#94a3b8" anchorX="center" anchorY="middle">
          {npc.tagline}
        </Text>
      </Billboard>

      {/* Animated ping ring */}
      <NPCPingRing color={npc.color} hovered={hovered} />

      {hovered && (
        <Billboard position={[0, 5.6, 0]}>
          <mesh>
            <planeGeometry args={[2.4, 0.6]} />
            <meshBasicMaterial color={npc.color} transparent opacity={0.92} />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.3} color="#050d1e" anchorX="center" anchorY="middle">
            💬 Click to chat!
          </Text>
        </Billboard>
      )}
    </group>
  );
}

function NPCPingRing({ color, hovered }: { color: string; hovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const scaleRef = useRef(1);

  useFrame((_, dt) => {
    scaleRef.current += dt * (hovered ? 2.5 : 1.2);
    if (scaleRef.current > 3.5) scaleRef.current = 1;
    if (!meshRef.current) return;
    meshRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
    const opacity = Math.max(0, 1 - (scaleRef.current - 1) / 2.5) * (hovered ? 0.8 : 0.35);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.58, 0.72, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}
