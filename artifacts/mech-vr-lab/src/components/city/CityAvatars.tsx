import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { getSocket } from "@/lib/socket";

type RemotePlayer = {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  heading: number;
  targetX: number;
  targetZ: number;
};

type ChatBubble = {
  playerId: string;
  message: string;
  expires: number;
};

function AvatarMesh({ player, bubble }: { player: RemotePlayer; bubble?: ChatBubble }) {
  const groupRef = useRef<THREE.Group>(null!);
  const posRef = useRef(new THREE.Vector3(player.x, 0, player.z));

  useFrame((_, dt) => {
    posRef.current.x = THREE.MathUtils.lerp(posRef.current.x, player.targetX, dt * 12);
    posRef.current.z = THREE.MathUtils.lerp(posRef.current.z, player.targetZ, dt * 12);
    groupRef.current.position.set(posRef.current.x, 0, posRef.current.z);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      player.heading,
      dt * 8,
    );
  });

  const msgText = bubble?.message ?? "";
  const showBubble = !!bubble && Date.now() < bubble.expires;

  return (
    <group ref={groupRef} position={[player.x, 0, player.z]}>
      {/* Body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.8, 8, 12]} />
        <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.25, 12, 10]} />
        <meshStandardMaterial color={player.color} emissive={player.color} emissiveIntensity={0.2} />
      </mesh>
      {/* Ground ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.45, 24]} />
        <meshBasicMaterial color={player.color} transparent opacity={0.6} />
      </mesh>
      {/* Name tag */}
      <Billboard position={[0, 2.8, 0]}>
        <mesh>
          <planeGeometry args={[2.5, 0.75]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.65} />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.38} color={player.color} anchorX="center" anchorY="middle">
          {player.name}
        </Text>
      </Billboard>
      {/* Chat bubble (appears when player sends a city message) */}
      {showBubble && (
        <Billboard position={[0, 4.0, 0]}>
          {/* Tail */}
          <mesh position={[0, -0.42, -0.01]}>
            <coneGeometry args={[0.14, 0.28, 3]} />
            <meshBasicMaterial color="#1a2f4a" />
          </mesh>
          {/* Bubble background */}
          <mesh>
            <planeGeometry args={[3.6, 0.85]} />
            <meshBasicMaterial color="#1a2f4a" />
          </mesh>
          {/* Border glow */}
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[3.65, 0.9]} />
            <meshBasicMaterial color={player.color} transparent opacity={0.4} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={3.3}
          >
            {msgText.length > 60 ? msgText.slice(0, 57) + "…" : msgText}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

export default function CityAvatars({ myId }: { myId: string }) {
  const [players, setPlayers] = useState<Map<string, RemotePlayer>>(new Map());
  const [chatBubbles, setChatBubbles] = useState<Map<string, ChatBubble>>(new Map());

  useEffect(() => {
    const socket = getSocket();

    socket.on("city:all", (list: { id: string; name: string; color: string; x: number; z: number; heading: number }[]) => {
      setPlayers(prev => {
        const next = new Map(prev);
        for (const p of list) {
          if (p.id !== myId) next.set(p.id, { ...p, targetX: p.x, targetZ: p.z });
        }
        return next;
      });
    });

    socket.on("city:joined", (p: { id: string; name: string; color: string; x: number; z: number; heading: number }) => {
      if (p.id === myId) return;
      setPlayers(prev => {
        const next = new Map(prev);
        next.set(p.id, { ...p, targetX: p.x, targetZ: p.z });
        return next;
      });
    });

    socket.on("city:moved", ({ id, x, z, heading }: { id: string; x: number; z: number; heading: number }) => {
      if (id === myId) return;
      setPlayers(prev => {
        const next = new Map(prev);
        const existing = next.get(id);
        if (existing) next.set(id, { ...existing, targetX: x, targetZ: z, heading });
        return next;
      });
    });

    socket.on("city:left", ({ id }: { id: string }) => {
      setPlayers(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });

    // Show chat bubble above the sender's avatar (not our own)
    socket.on("city:chatMsg", ({ id, message }: { id: string; name: string; color: string; message: string }) => {
      if (id === myId) return;
      setChatBubbles(prev => {
        const next = new Map(prev);
        next.set(id, { playerId: id, message, expires: Date.now() + 6000 });
        return next;
      });
    });

    return () => {
      socket.off("city:all");
      socket.off("city:joined");
      socket.off("city:moved");
      socket.off("city:left");
      socket.off("city:chatMsg");
    };
  }, [myId]);

  // Clean up expired bubbles every second
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setChatBubbles(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [k, b] of next) {
          if (b.expires < now) { next.delete(k); changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <group>
      {[...players.values()].map(p => (
        <AvatarMesh key={p.id} player={p} bubble={chatBubbles.get(p.id)} />
      ))}
    </group>
  );
}
