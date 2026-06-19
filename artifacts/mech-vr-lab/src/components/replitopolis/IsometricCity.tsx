import { useRef, useMemo, Suspense, useState, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, Text, Stars, Cloud, Float } from "@react-three/drei";
import * as T from "three";
import { DISTRICTS, type RBuilding, type RDistrict } from "@/data/replitopolisData";

/* ─── WebGL availability check ─────────────────────────────────── */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/* ─── WebGL Error Boundary ─────────────────────────────────────── */
class WebGLBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="text-4xl">🏙️</div>
          <div className="text-sm font-semibold text-slate-300">3D city unavailable</div>
          <div className="text-xs text-slate-500 text-center max-w-xs">
            WebGL is not available in this environment.<br />Try opening the app in a modern desktop browser.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── District positions (XZ plane) ───────────────────────────── */
const DISTRICT_POSITIONS: Record<string, [number, number]> = {
  engineering:     [-50, -50],
  technology:      [0,   -65],
  business:        [50,  -50],
  trades:          [-65,   0],
  healthcare:      [65,    0],
  law:             [-50,  50],
  exploratory:     [0,    65],
  entrepreneurship:[50,   50],
  liveworld:       [0,   100],
};

/* ─── Util ────────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }


/* ─── Ground / sky ────────────────────────────────────────────── */
function CityGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#060e1e" roughness={1} metalness={0} />
    </mesh>
  );
}

/* ─── Road strip ─────────────────────────────────────────────── */
function Road({ from, to, color }: { from: [number, number]; to: [number, number]; color: string }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;
  const angle = Math.atan2(dz, dx);
  return (
    <group position={[midX, 0.01, midZ]} rotation={[0, -angle, 0]}>
      {/* Road surface */}
      <mesh receiveShadow>
        <boxGeometry args={[len, 0.04, 8]} />
        <meshStandardMaterial color="#0c1624" roughness={0.95} />
      </mesh>
      {/* Neon edge strips */}
      <mesh position={[0, 0.03, 3.8]}>
        <boxGeometry args={[len, 0.04, 0.25]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.03, -3.8]}>
        <boxGeometry args={[len, 0.04, 0.25]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      {/* Dashed center line */}
      {Array.from({ length: Math.floor(len / 8) }).map((_, i) => (
        <mesh key={i} position={[-len / 2 + 4 + i * 8, 0.04, 0]}>
          <boxGeometry args={[4, 0.03, 0.15]} />
          <meshStandardMaterial color="#f5a524" emissive="#f5a524" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Sidewalk ───────────────────────────────────────────────── */
function Sidewalk({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;
  const angle = Math.atan2(dz, dx);
  return (
    <group position={[midX, 0.02, midZ]} rotation={[0, -angle, 0]}>
      <mesh position={[0, 0, 5.2]} receiveShadow>
        <boxGeometry args={[len, 0.04, 1.8]} />
        <meshStandardMaterial color="#111a2e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, -5.2]} receiveShadow>
        <boxGeometry args={[len, 0.04, 1.8]} />
        <meshStandardMaterial color="#111a2e" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ─── Streetlight ────────────────────────────────────────────── */
function Streetlight({ pos }: { pos: [number, number, number] }) {
  const glowRef = useRef<T.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 1.5 + pos[0]) * 0.2;
    }
  });
  return (
    <group position={pos}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.15, 6, 8]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[1.5, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 6]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[2.8, 3, 0]}>
        <sphereGeometry args={[0.35, 12, 8]} />
        <meshStandardMaterial ref={glowRef} color="#fffacc" emissive="#fffacc" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[2.8, 3, 0]} color="#fffde0" intensity={8} distance={18} decay={2} />
    </group>
  );
}

/* ─── Low-poly tree ──────────────────────────────────────────── */
function Tree({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 3, 6]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4, 0]} castShadow>
        <coneGeometry args={[2.2, 4, 7]} />
        <meshStandardMaterial color="#1a4a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <coneGeometry args={[1.6, 3.5, 7]} />
        <meshStandardMaterial color="#1e5c38" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ─── Park bench ─────────────────────────────────────────────── */
function Bench({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[2.5, 0.12, 0.7]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
      </mesh>
      <mesh position={[-0.9, 0.3, 0]} castShadow>
        <boxGeometry args={[0.12, 0.6, 0.7]} />
        <meshStandardMaterial color="#4a2e10" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.3, 0]} castShadow>
        <boxGeometry args={[0.12, 0.6, 0.7]} />
        <meshStandardMaterial color="#4a2e10" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ─── Park patch ─────────────────────────────────────────────── */
function Park({ pos, w = 28, d = 20 }: { pos: [number, number, number]; w?: number; d?: number }) {
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#133a1e" roughness={0.9} />
      </mesh>
      {/* Fountain */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.8, 0.8, 16]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 2, 8]} />
        <meshStandardMaterial color="#a0c4e8" emissive="#4fb5f0" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#4fb5f0" intensity={15} distance={10} />
      <Tree pos={[-8, 0, -6]} scale={0.9} />
      <Tree pos={[8, 0, -6]} scale={0.8} />
      <Tree pos={[-8, 0, 6]} scale={1.0} />
      <Tree pos={[8, 0, 6]} scale={0.85} />
      <Bench pos={[-4, 0, 4]} />
      <Bench pos={[4, 0, 4]} />
    </group>
  );
}

/* ─── Career Hub ─────────────────────────────────────────────── */
function CareerHub() {
  const ref = useRef<T.Group>(null!);
  const ringRef = useRef<T.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y += 0.003;
    if (ringRef.current) {
      ringRef.current.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 2) * 0.5;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      {/* Plaza base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color="#10213a" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[18, 20, 64]} />
        <meshStandardMaterial ref={ringRef} color="#f5a524" emissive="#f5a524" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 1, 0]} color="#f5a524" intensity={40} distance={28} decay={2} />

      {/* Gold pyramid (slowly rotating) */}
      <group ref={ref}>
        <mesh position={[0, 8, 0]} castShadow>
          <octahedronGeometry args={[7, 0]} />
          <meshStandardMaterial
            color="#f5a524"
            emissive="#f5a524"
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>
        <pointLight position={[0, 10, 0]} color="#f5a524" intensity={60} distance={50} decay={2} />
      </group>

      {/* Hub label */}
      <Float speed={1.5} floatIntensity={0.5}>
        <Text
          position={[0, 18, 0]}
          fontSize={3.5}
          color="#f5a524"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#0a1428"
        >
          CAREER HUB
        </Text>
        <Text
          position={[0, 14.5, 0]}
          fontSize={1.6}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          1WayMirror
        </Text>
      </Float>

      {/* 4 trees around plaza */}
      <Tree pos={[14, 0, 0]} scale={0.7} />
      <Tree pos={[-14, 0, 0]} scale={0.7} />
      <Tree pos={[0, 0, 14]} scale={0.7} />
      <Tree pos={[0, 0, -14]} scale={0.7} />
      {/* Benches */}
      <Bench pos={[10, 0, 5]} />
      <Bench pos={[-10, 0, 5]} />
    </group>
  );
}

/* ─── Building ────────────────────────────────────────────────── */
function Building({
  pos,
  w,
  h,
  d,
  color,
  glowColor,
  onClick,
  label,
}: {
  pos: [number, number, number];
  w: number; h: number; d: number;
  color: string;
  glowColor: string;
  onClick: () => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<T.Group>(null!);
  const matRef = useRef<T.MeshStandardMaterial>(null!);

  useFrame(() => {
    if (groupRef.current) {
      const targetY = (hovered ? 0.8 : 0);
      groupRef.current.position.y = lerp(groupRef.current.position.y, targetY, 0.12);
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = hovered ? 0.35 : 0;
    }
  });

  // Window rows (simple box meshes on the front face)
  const windows = useMemo(() => {
    const rows = Math.min(Math.floor(h / 2.8), 6);
    const cols = Math.min(Math.floor(w / 2.4), 4);
    const result: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          x: -w / 2 + 1.4 + c * 2.4,
          y: 1.8 + r * 2.8,
        });
      }
    }
    return result;
  }, [w, h]);

  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={groupRef} position={[0, pos[1], 0]}>
        {/* Main building body */}
        <mesh
          castShadow
          receiveShadow
          onClick={e => { e.stopPropagation(); onClick(); }}
          onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
        >
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            ref={matRef}
            color={color}
            roughness={0.35}
            metalness={0.55}
            emissive={glowColor}
            emissiveIntensity={0}
          />
        </mesh>

        {/* Window dots */}
        {windows.map((win, i) => (
          <mesh key={i} position={[win.x, win.y - h / 2, d / 2 + 0.06]}>
            <boxGeometry args={[0.85, 1.1, 0.08]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={hovered ? 3.5 : 2}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}

        {/* Neon roof accent */}
        <mesh position={[0, h / 2 + 0.18, 0]}>
          <boxGeometry args={[w + 0.5, 0.35, d + 0.5]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2.5} />
        </mesh>

        {/* Hover outline */}
        {hovered && (
          <mesh>
            <boxGeometry args={[w + 0.6, h + 0.6, d + 0.6]} />
            <meshStandardMaterial color={glowColor} transparent opacity={0.1} side={T.BackSide} />
          </mesh>
        )}

        {/* Hover label */}
        {hovered && (
          <Float speed={2} floatIntensity={0.3}>
            <Text
              position={[0, h / 2 + 5, 0]}
              fontSize={1.5}
              color="#ffffff"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.08}
              outlineColor="#0a1428"
              maxWidth={20}
            >
              {label}
            </Text>
          </Float>
        )}
      </group>
    </group>
  );
}

/* ─── District Zone ───────────────────────────────────────────── */
function DistrictZone({
  district,
  cx,
  cz,
  onBuildingClick,
  onEnter,
}: {
  district: RDistrict;
  cx: number;
  cz: number;
  onBuildingClick: (b: RBuilding, d: RDistrict) => void;
  onEnter: (id: string) => void;
}) {
  const labelRef = useRef<T.Group>(null!);
  const plateRef = useRef<T.MeshStandardMaterial>(null!);

  useFrame(({ clock }) => {
    if (plateRef.current) {
      plateRef.current.emissiveIntensity = 0.06 + 0.04 * Math.sin(clock.elapsedTime * 1.2 + cx);
    }
  });

  // Layout buildings in a grid within the district
  const buildingDefs = useMemo(() => {
    const shown = district.buildings.slice(0, 6);
    const cols = Math.ceil(Math.sqrt(shown.length));
    return shown.map((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = (col - (cols - 1) / 2) * 11;
      const oz = (row - (Math.ceil(shown.length / cols) - 1) / 2) * 11;
      const heights = [8, 13, 18, 11, 15, 9];
      const widths =  [6,  7,  5,  8,  6, 7];
      return { b, ox, oz, h: heights[i % heights.length], w: widths[i % widths.length] };
    });
  }, [district]);

  return (
    <group position={[cx, 0, cz]}>
      {/* Ground plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[56, 56]} />
        <meshStandardMaterial
          ref={plateRef}
          color={district.color}
          emissive={district.border}
          emissiveIntensity={0.06}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* District label */}
      <Float speed={1} floatIntensity={0.4}>
        <group ref={labelRef} position={[0, 26, 0]}>
          <Text
            fontSize={2.8}
            color={district.border}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#0a1428"
          >
            {district.icon} {district.name}
          </Text>
          <Text
            position={[0, -3.5, 0]}
            fontSize={1.5}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
          >
            {district.description}
          </Text>
        </group>
      </Float>

      {/* Neon border pulse ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[26, 28, 4]} />
        <meshStandardMaterial color={district.border} emissive={district.border} emissiveIntensity={0.6} transparent opacity={0.4} />
      </mesh>

      {/* Buildings */}
      {buildingDefs.map(({ b, ox, oz, h, w }) => (
        <Building
          key={b.id}
          pos={[ox, h / 2, oz]}
          w={w}
          h={h}
          d={w}
          color={district.color}
          glowColor={district.border}
          onClick={() => {
            onBuildingClick(b, district);
            onEnter(district.id);
          }}
          label={b.name}
        />
      ))}

      {/* Street trees at edges */}
      <Tree pos={[-24, 0, -24]} scale={0.6} />
      <Tree pos={[24, 0, -24]} scale={0.55} />
      <Tree pos={[-24, 0, 24]} scale={0.65} />
      <Tree pos={[24, 0, 24]} scale={0.6} />

      {/* Streetlights */}
      <Streetlight pos={[-22, 0, 0]} />
      <Streetlight pos={[22, 0, 0]} />
      <Streetlight pos={[0, 0, -22]} />
      <Streetlight pos={[0, 0, 22]} />
    </group>
  );
}

/* ─── Animated vehicle ────────────────────────────────────────── */
type VehiclePath = { pts: [number, number, number][]; color: string; speed: number; type: "car" | "bus" | "scooter" };

function Vehicle({ path }: { path: VehiclePath }) {
  const ref = useRef<T.Group>(null!);
  const t = useRef(Math.random());

  const curve = useMemo(() => {
    const v3 = path.pts.map(([x, y, z]) => new T.Vector3(x, y, z));
    return new T.CatmullRomCurve3(v3, true);
  }, [path.pts]);

  useFrame((_, dt) => {
    t.current = (t.current + dt * path.speed * 0.012) % 1;
    const pos = curve.getPoint(t.current);
    const tangent = curve.getTangent(t.current);
    if (ref.current) {
      ref.current.position.copy(pos);
      ref.current.lookAt(pos.clone().add(tangent));
    }
  });

  const isBus = path.type === "bus";
  const isScooter = path.type === "scooter";
  const bl = isBus ? 14 : isScooter ? 2.5 : 5;
  const bw = isBus ? 3.5 : isScooter ? 1.2 : 2.5;
  const bh = isBus ? 4 : isScooter ? 1.5 : 1.8;

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh castShadow position={[0, bh / 2 + 0.2, 0]}>
        <boxGeometry args={[bl, bh, bw]} />
        <meshStandardMaterial color={path.color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Windows row */}
      {isBus && (
        <mesh position={[0, bh + 0.2 - 0.5, bw / 2 + 0.05]}>
          <boxGeometry args={[bl - 2, bh * 0.4, 0.1]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.8} transparent opacity={0.6} />
        </mesh>
      )}
      {/* Headlights */}
      <mesh position={[bl / 2 + 0.05, bh / 2 + 0.2, 0]}>
        <boxGeometry args={[0.1, 0.6, 1.2]} />
        <meshStandardMaterial color="#fffde0" emissive="#fffde0" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[bl / 2 + 1, bh / 2 + 0.2, 0]} color="#fffde0" intensity={20} distance={12} decay={2} />
      {/* Taillights */}
      <mesh position={[-bl / 2 - 0.05, bh / 2 + 0.2, 0]}>
        <boxGeometry args={[0.1, 0.5, 1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
      </mesh>
      {/* Wheels */}
      {[bl * 0.35, -bl * 0.35].map((wx, i) => [bw / 2 + 0.1, -bw / 2 - 0.1].map((wz, j) => (
        <mesh key={`${i}-${j}`} position={[wx, 0.45, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.6, 0.6, 0.4, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      )))}
    </group>
  );
}

/* ─── All vehicles on roads ───────────────────────────────────── */
function CityVehicles() {
  const vehicles: VehiclePath[] = useMemo(() => [
    {
      color: "#f5a524",
      speed: 1.1,
      type: "car",
      pts: [
        [0, 0.6, -30], [25, 0.6, -35], [50, 0.6, -20], [45, 0.6, 10],
        [20, 0.6, 30], [0, 0.6, 25], [-20, 0.6, 30], [-45, 0.6, 5],
        [-50, 0.6, -20], [-25, 0.6, -35],
      ],
    },
    {
      color: "#3b82f6",
      speed: 0.7,
      type: "bus",
      pts: [
        [0, 0.6, -38], [38, 0.6, -38], [48, 0.6, 0],
        [38, 0.6, 38], [0, 0.6, 48], [-38, 0.6, 38],
        [-48, 0.6, 0], [-38, 0.6, -38],
      ],
    },
    {
      color: "#22c55e",
      speed: 1.3,
      type: "car",
      pts: [
        [-50, 0.6, 0], [-30, 0.6, -40], [0, 0.6, -55],
        [30, 0.6, -40], [50, 0.6, 0], [30, 0.6, 40],
        [0, 0.6, 55], [-30, 0.6, 40],
      ],
    },
    {
      color: "#ec4899",
      speed: 1.6,
      type: "scooter",
      pts: [
        [0, 0.6, -22], [22, 0.6, -10], [10, 0.6, 22],
        [-10, 0.6, 22], [-22, 0.6, -10],
      ],
    },
    {
      color: "#a855f7",
      speed: 0.9,
      type: "car",
      pts: [
        [0, 0.6, 25], [25, 0.6, 10], [30, 0.6, -15],
        [10, 0.6, -35], [-10, 0.6, -35], [-30, 0.6, -15],
        [-25, 0.6, 10],
      ],
    },
  ], []);

  return (
    <>
      {vehicles.map((v, i) => <Vehicle key={i} path={v} />)}
    </>
  );
}

/* ─── Monorail ────────────────────────────────────────────────── */
function MonorailTrack() {
  const trainRef = useRef<T.Group>(null!);
  const t = useRef(0);
  const trackRadius = 130;

  useFrame((_, dt) => {
    t.current = (t.current + dt * 0.06) % (Math.PI * 2);
    if (trainRef.current) {
      trainRef.current.position.x = Math.cos(t.current) * trackRadius;
      trainRef.current.position.z = Math.sin(t.current) * trackRadius;
      trainRef.current.rotation.y = -t.current + Math.PI / 2;
    }
  });

  return (
    <group>
      {/* Track ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 16, 0]}>
        <ringGeometry args={[trackRadius - 0.5, trackRadius + 0.5, 96]} />
        <meshStandardMaterial color="#2a3a5a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Support pillars */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * trackRadius, 8, Math.sin(angle) * trackRadius]} castShadow>
            <cylinderGeometry args={[0.6, 0.8, 16, 8]} />
            <meshStandardMaterial color="#1e2d44" metalness={0.7} roughness={0.4} />
          </mesh>
        );
      })}
      {/* Train */}
      <group ref={trainRef} position={[trackRadius, 16.5, 0]}>
        {[-14, 0, 14].map((offset, i) => (
          <mesh key={i} position={[offset, 0, 0]} castShadow>
            <boxGeometry args={[12, 4, 5]} />
            <meshStandardMaterial color="#1e4080" roughness={0.3} metalness={0.6} />
          </mesh>
        ))}
        {/* Train windows */}
        {[-14, 0, 14].map((offset, i) => (
          <mesh key={`w${i}`} position={[offset, 0.5, 2.6]}>
            <boxGeometry args={[10, 1.8, 0.1]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={1.2} transparent opacity={0.7} />
          </mesh>
        ))}
        <pointLight position={[20, 0, 0]} color="#7dd3fc" intensity={15} distance={20} decay={2} />
      </group>
    </group>
  );
}

/* ─── Holographic billboard ───────────────────────────────────── */
function Billboard({ pos, text, color }: { pos: [number, number, number]; text: string; color: string }) {
  const ref = useRef<T.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 1.8) * 0.4;
  });
  return (
    <group position={pos}>
      {/* Pole */}
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.4, 20, 8]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Sign */}
      <mesh position={[0, 13, 0]} castShadow>
        <boxGeometry args={[14, 6, 0.4]} />
        <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <Float speed={1.2} floatIntensity={0.3}>
        <Text position={[0, 13, 0.25]} fontSize={1.4} color="#fff" anchorX="center" anchorY="middle" maxWidth={12} textAlign="center">
          {text}
        </Text>
      </Float>
    </group>
  );
}

/* ─── Holographic district icon ────────────────────────────────── */
function HoloPillar({ pos, icon, color }: { pos: [number, number, number]; icon: string; color: string }) {
  const beamRef = useRef<T.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (beamRef.current) beamRef.current.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 2.5) * 0.4;
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 30, 12]} />
        <meshStandardMaterial ref={beamRef} color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.3} />
      </mesh>
      <Float speed={2} floatIntensity={1}>
        <Text position={[0, 20, 0]} fontSize={4} anchorX="center" anchorY="middle">
          {icon}
        </Text>
      </Float>
    </group>
  );
}

/* ─── Shop (storefront) ───────────────────────────────────────── */
function Shop({ pos, color, sign, emoji }: { pos: [number, number, number]; color: string; sign: string; emoji: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <boxGeometry args={[8, 5, 6]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Awning */}
      <mesh position={[0, 3.5, 3.4]} rotation={[0.4, 0, 0]} castShadow>
        <boxGeometry args={[8, 0.2, 3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Window glow */}
      <mesh position={[0, 1.5, 3.1]}>
        <boxGeometry args={[5, 2.5, 0.1]} />
        <meshStandardMaterial color="#fffde0" emissive="#fffde0" emissiveIntensity={1.2} transparent opacity={0.6} />
      </mesh>
      <pointLight position={[0, 2, 4]} color={color} intensity={12} distance={8} decay={2} />
      {hovered && (
        <Float speed={3} floatIntensity={0.3}>
          <Text position={[0, 8, 0]} fontSize={1.6} color="#fff" anchorX="center" anchorY="middle" outlineWidth={0.06} outlineColor="#0a1428">
            {emoji} {sign}{"\n"}Coming soon!
          </Text>
        </Float>
      )}
    </group>
  );
}

/* ─── Full city scene ─────────────────────────────────────────── */
function CityScene({
  onBuildingClick,
  onVisitDistrict,
}: {
  onBuildingClick: (b: RBuilding, d: RDistrict) => void;
  onVisitDistrict: (id: string) => void;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#0d2044" />
      <directionalLight
        position={[80, 120, 60]}
        intensity={0.9}
        color="#cce8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <directionalLight position={[-60, 60, -60]} intensity={0.2} color="#6b4aff" />

      {/* Starfield */}
      <Stars radius={300} depth={80} count={5000} factor={4} saturation={0} fade speed={0.4} />
      <Cloud position={[80, 120, -80]} opacity={0.04} speed={0.08} />
      <Cloud position={[-80, 140, 60]} opacity={0.03} speed={0.06} />

      {/* Atmospheric fog */}
      <fog attach="fog" args={["#020a18", 80, 350]} />

      <CityGround />
      <CareerHub />

      {/* Roads from hub to each district */}
      {DISTRICTS.map(d => {
        const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
        return (
          <group key={d.id}>
            <Road from={[0, 0]} to={[cx, cz]} color={d.border} />
            <Sidewalk from={[0, 0]} to={[cx, cz]} />
          </group>
        );
      })}

      {/* District zones */}
      {DISTRICTS.map(d => {
        const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
        return (
          <DistrictZone
            key={d.id}
            district={d}
            cx={cx}
            cz={cz}
            onBuildingClick={onBuildingClick}
            onEnter={onVisitDistrict}
          />
        );
      })}

      {/* Parks between districts */}
      <Park pos={[-35, 0.05, -15]} w={22} d={18} />
      <Park pos={[35, 0.05, -15]} w={22} d={18} />
      <Park pos={[-35, 0.05, 20]} w={20} d={16} />
      <Park pos={[35, 0.05, 20]} w={20} d={16} />

      {/* Shops between districts */}
      <Shop pos={[-20, 2.5, -30]} color="#78350f" sign="Career Café" emoji="☕" />
      <Shop pos={[20, 2.5, -30]} color="#7c2d12" sign="Pizza Stop" emoji="🍕" />
      <Shop pos={[30, 2.5, 15]} color="#4c1d95" sign="Arcade Zone" emoji="🕹️" />
      <Shop pos={[-30, 2.5, 15]} color="#14532d" sign="Bookstore" emoji="📚" />
      <Shop pos={[0, 2.5, -25]} color="#0c4a6e" sign="Boba & Ramen" emoji="🧋" />
      <Shop pos={[-10, 2.5, 30]} color="#713f12" sign="Bodega" emoji="🛒" />

      {/* Billboards */}
      <Billboard pos={[-80, 0, -20]} text={"Explore 50+\nCareers"} color="#f5a524" />
      <Billboard pos={[80, 0, -20]} text={"Earn Badges\nLevel Up"} color="#8b5cf6" />
      <Billboard pos={[0, 0, -100]} text={"Join LiveWorld\nPlay Together"} color="#0ea5e9" />

      {/* Holo pillars over tech + business districts */}
      <HoloPillar pos={[0, 0, -65]} icon="🧠" color="#a855f7" />
      <HoloPillar pos={[50, 0, -50]} icon="💰" color="#f5a524" />

      {/* Monorail */}
      <MonorailTrack />

      {/* Vehicles */}
      <CityVehicles />

      {/* Extra ambient streetlights on roads */}
      {[[-18, 0, -26], [18, 0, -26], [-26, 0, 0], [26, 0, 0], [-18, 0, 26], [18, 0, 26]].map((p, i) => (
        <Streetlight key={i} pos={p as [number, number, number]} />
      ))}
    </>
  );
}


/* ─── Mini-map overlay ────────────────────────────────────────── */
export function CityMiniMap({
  visitedDistricts,
  onZoneClick,
}: {
  visitedDistricts: Set<string>;
  onZoneClick: (id: string) => void;
}) {
  const SIZE = 200;
  const SCALE = SIZE / 260;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{
      width: SIZE, height: SIZE,
      background: "#060e1e",
      border: "1px solid rgba(245,165,36,0.3)",
    }}>
      <svg width={SIZE} height={SIZE} viewBox={`${-130} ${-130} 260 260`}>
        {/* Roads */}
        {DISTRICTS.map(d => {
          const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
          return (
            <line key={d.id}
              x1={0} y1={0} x2={cx} y2={cz}
              stroke={d.border}
              strokeWidth={2}
              opacity={0.4}
            />
          );
        })}
        {/* Districts */}
        {DISTRICTS.map(d => {
          const [cx, cz] = DISTRICT_POSITIONS[d.id] ?? [0, 0];
          const visited = visitedDistricts.has(d.id);
          return (
            <g key={d.id} style={{ cursor: "pointer" }} onClick={() => onZoneClick(d.id)}>
              <circle
                cx={cx} cy={cz}
                r={20}
                fill={d.color}
                stroke={d.border}
                strokeWidth={visited ? 2.5 : 1}
                opacity={visited ? 0.95 : 0.6}
              />
              <text
                x={cx} y={cz + 5}
                textAnchor="middle"
                fontSize={12}
                fill="#fff"
              >
                {d.icon}
              </text>
              {visited && (
                <circle cx={cx + 14} cy={cz - 14} r={5} fill="#22c55e" stroke="#fff" strokeWidth={1} />
              )}
            </g>
          );
        })}
        {/* Monorail ring */}
        <circle cx={0} cy={0} r={130} fill="none" stroke="#1e4080" strokeWidth={2} strokeDasharray="6 4" opacity={0.5} />
        {/* Hub */}
        <circle cx={0} cy={0} r={14} fill="#f5a524" opacity={0.9} />
        <text x={0} y={5} textAnchor="middle" fontSize={10} fill="#0a1428" fontWeight="bold">HUB</text>
        {/* Player dot */}
        <circle cx={0} cy={0} r={5} fill="#22c55e">
          <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono">1WayMirror</div>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────── */
export default function IsometricCity({
  onBuildingClick,
  onVisitDistrict,
  liteMode = false,
}: {
  onBuildingClick: (b: RBuilding, d: RDistrict) => void;
  onVisitDistrict: (id: string) => void;
  liteMode?: boolean;
}) {
  if (liteMode || !hasWebGL()) {
    const noWebGL = !liteMode && !hasWebGL();
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
        {noWebGL ? (
          <>
            <div className="text-4xl">🏙️</div>
            <div className="text-sm font-semibold text-slate-300">3D city unavailable</div>
            <div className="text-xs text-slate-500 text-center max-w-xs">
              WebGL is not supported in this environment.<br />Open the app in a modern desktop browser to see the full city.
            </div>
          </>
        ) : (
          <div className="text-sm">3D city hidden in Lite Mode</div>
        )}
      </div>
    );
  }

  return (
    <WebGLBoundary>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: T.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = T.PCFSoftShadowMap;
        }}
      >
        <OrthographicCamera
          makeDefault
          position={[120, 130, 120]}
          zoom={4.5}
          near={1}
          far={1000}
        />
        <Suspense fallback={null}>
          <CityScene onBuildingClick={onBuildingClick} onVisitDistrict={onVisitDistrict} />
        </Suspense>
      </Canvas>
    </WebGLBoundary>
  );
}
