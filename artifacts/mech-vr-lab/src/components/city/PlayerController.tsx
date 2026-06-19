import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { getSocket } from "@/lib/socket";
import { buildFortniteCharacter, type CharacterColors } from "./FortniteCharacter";
import { COLLISION_CIRCLES, BENCH_COLLIDERS, BUILDING_COLLIDERS, WORLD_LIMIT } from "./cityColliders";

const SPEED = 14;
const CAM_HEIGHT = 13;
const CAM_DIST = 22;
const PLAYER_RADIUS = 0.95;

/** All static collision circles: [worldX, worldZ, radius] */
const ALL_COLLIDERS: [number, number, number][] = [
  ...COLLISION_CIRCLES,
  ...BENCH_COLLIDERS,
  ...BUILDING_COLLIDERS,
];

/** Push player position out of any overlapping circles */
function resolveCollisions(pos: THREE.Vector3): void {
  for (const [ox, oz, r] of ALL_COLLIDERS) {
    const dx = pos.x - ox;
    const dz = pos.z - oz;
    const dist2 = dx * dx + dz * dz;
    const minDist = r + PLAYER_RADIUS;
    if (dist2 < minDist * minDist && dist2 > 0.0001) {
      const dist = Math.sqrt(dist2);
      const push = (minDist - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    }
  }
}

type Props = {
  name: string;
  colors: CharacterColors;
  onPositionChange?: (x: number, z: number) => void;
};

function PlayerBody({
  colors,
  bodyRef,
}: {
  colors: CharacterColors;
  bodyRef: React.MutableRefObject<THREE.Group>;
}) {
  useEffect(() => {
    const grp = bodyRef.current;
    if (!grp) return;
    while (grp.children.length) grp.remove(grp.children[0]);
    buildFortniteCharacter(colors, grp);
  }, [colors, bodyRef]);

  return (
    <>
      <group ref={bodyRef} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.66, 32]} />
        <meshBasicMaterial color={colors.outfitColor} transparent opacity={0.7} />
      </mesh>
    </>
  );
}

export default function PlayerController({ name, colors, onPositionChange }: Props) {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const headingRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const lastBroadcast = useRef(0);
  const camAngleRef = useRef(0);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const walkTimeRef = useRef(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const mouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };
    const mouseUp = () => { isDragging.current = false; };
    const mouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        camAngleRef.current -= (e.clientX - lastMouse.current.x) * 0.008;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };
    const noCtx = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("contextmenu", noCtx);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("contextmenu", noCtx);
    };
  }, []);

  useFrame((_, dt) => {
    const k = keys.current;
    let dx = 0, dz = 0;

    // Camera sits at pos + (sin, CAM_HEIGHT, cos)*CAM_DIST.
    // "Forward" for the player = direction AWAY from camera = -(sin, 0, cos).
    const fwdX = -Math.sin(camAngleRef.current);
    const fwdZ = -Math.cos(camAngleRef.current);
    const rightX =  Math.cos(camAngleRef.current);
    const rightZ = -Math.sin(camAngleRef.current);

    // Up arrow / W → move forward (away from camera into scene)
    if (k.has("w") || k.has("arrowup"))    { dx += fwdX; dz += fwdZ; }
    if (k.has("s") || k.has("arrowdown"))  { dx -= fwdX; dz -= fwdZ; }
    if (k.has("d") || k.has("arrowright")) { dx += rightX; dz += rightZ; }
    if (k.has("a") || k.has("arrowleft"))  { dx -= rightX; dz -= rightZ; }

    const len = Math.sqrt(dx * dx + dz * dz);
    const isMoving = len > 0;

    if (isMoving) {
      posRef.current.x += (dx / len) * SPEED * dt;
      posRef.current.z += (dz / len) * SPEED * dt;
      headingRef.current = Math.atan2(dx, dz);
      walkTimeRef.current += dt;

      // World boundary
      posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, -WORLD_LIMIT, WORLD_LIMIT);
      posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, -WORLD_LIMIT, WORLD_LIMIT);

      // Collision
      resolveCollisions(posRef.current);
    }

    // ── Walking animation ──
    const walkFreq = 6.5;
    const bob = isMoving ? Math.sin(walkTimeRef.current * walkFreq) * 0.11 : 0;
    const lean = isMoving ? 0.06 : 0;

    if (groupRef.current) {
      groupRef.current.position.set(posRef.current.x, bob, posRef.current.z);
      if (isMoving) {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          headingRef.current,
          dt * 9,
        );
      }
      // Gentle forward lean while walking
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        lean,
        dt * 7,
      );
    }

    // ── Leg & arm swing on body children ──
    if (bodyRef.current && bodyRef.current.children.length >= 13) {
      const c = bodyRef.current.children;
      const swing = isMoving ? Math.sin(walkTimeRef.current * walkFreq) * 0.42 : 0;
      const arm   = isMoving ? Math.sin(walkTimeRef.current * walkFreq) * 0.32 : 0;
      // children 0,1 = shoes; 2,3 = lower legs; 4,5 = upper legs; 11,12 = upper arms
      if (c[0]) c[0].rotation.x = THREE.MathUtils.lerp(c[0].rotation.x,  swing * 0.3, dt * 12);
      if (c[1]) c[1].rotation.x = THREE.MathUtils.lerp(c[1].rotation.x, -swing * 0.3, dt * 12);
      if (c[2]) c[2].rotation.x = THREE.MathUtils.lerp(c[2].rotation.x,  swing * 0.5, dt * 12);
      if (c[3]) c[3].rotation.x = THREE.MathUtils.lerp(c[3].rotation.x, -swing * 0.5, dt * 12);
      if (c[4]) c[4].rotation.x = THREE.MathUtils.lerp(c[4].rotation.x, -swing * 0.55, dt * 12);
      if (c[5]) c[5].rotation.x = THREE.MathUtils.lerp(c[5].rotation.x,  swing * 0.55, dt * 12);
      // Arms swing opposite to legs
      if (c[11]) c[11].rotation.z = THREE.MathUtils.lerp(c[11].rotation.z, -arm * 0.4, dt * 12);
      if (c[12]) c[12].rotation.z = THREE.MathUtils.lerp(c[12].rotation.z,  arm * 0.4, dt * 12);
    }

    // ── Camera follow ──
    const camX = posRef.current.x + Math.sin(camAngleRef.current) * CAM_DIST;
    const camZ = posRef.current.z + Math.cos(camAngleRef.current) * CAM_DIST;
    camera.position.lerp(new THREE.Vector3(camX, CAM_HEIGHT, camZ), dt * 6);
    camera.lookAt(posRef.current.x, 1.2, posRef.current.z);

    // ── Broadcast position ──
    const now = Date.now();
    if (now - lastBroadcast.current > 100) {
      lastBroadcast.current = now;
      const socket = getSocket();
      socket.emit("city:move", {
        x: Math.round(posRef.current.x * 10) / 10,
        z: Math.round(posRef.current.z * 10) / 10,
        heading: headingRef.current,
      });
      onPositionChange?.(posRef.current.x, posRef.current.z);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <PlayerBody colors={colors} bodyRef={bodyRef} />
      <Billboard position={[0, 4.6, 0]}>
        <mesh>
          <planeGeometry args={[3.6, 0.85]} />
          <meshBasicMaterial color="#050d1e" transparent opacity={0.88} />
        </mesh>
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[3.64, 0.89]} />
          <meshBasicMaterial color={colors.outfitColor} transparent opacity={0.32} />
        </mesh>
        <Text position={[0, 0.01, 0.01]} fontSize={0.42} color={colors.accentColor} anchorX="center" anchorY="middle">
          ⭐ {name} (You)
        </Text>
      </Billboard>
    </group>
  );
}
