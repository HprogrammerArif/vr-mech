import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, RoundedBox, Cylinder, Sphere, Box, Torus, Cone, Float, Stars, Cloud } from "@react-three/drei";
import * as THREE from "three";

type Params = Record<string, unknown>;

const GOLD = "#f5a524";
const GOLD_DIM = "#a26c10";
const NAVY = "#0a1428";
const NAVY_LIGHT = "#15243f";
const STEEL = "#7c8aa1";
const STEEL_LIGHT = "#c4cdd9";
const WHITE = "#ffffff";
const WARN_RED = "#ef4444";
const GREEN = "#22c55e";

function strParam(p: Params, key: string, fallback = ""): string {
  const v = p?.[key];
  return typeof v === "string" ? v : fallback;
}

function Label({ text, position, color = WHITE, size = 0.22 }: {
  text: string; position: [number, number, number]; color?: string; size?: number;
}) {
  return (
    <Text position={position} fontSize={size} color={color} anchorX="center" anchorY="middle"
      outlineWidth={0.015} outlineColor="#000">
      {text}
    </Text>
  );
}

/* ── Shared floor ── */
function Floor({ color = "#0a1428", size = 24 }: { color?: string; size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/* ── Animated gear ── */
function Gear({ radius = 0.4, teeth = 12, pos, speed = 1, color = GOLD }: {
  radius?: number; teeth?: number; pos: [number, number, number]; speed?: number; color?: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * speed; });
  return (
    <group ref={ref} position={pos}>
      <Cylinder args={[radius, radius, 0.12, 32]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
      </Cylinder>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <Box key={i} args={[0.1, 0.18, 0.12]}
            position={[Math.cos(a) * (radius + 0.08), Math.sin(a) * (radius + 0.08), 0]}
            rotation={[0, 0, a]} castShadow>
            <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
          </Box>
        );
      })}
    </group>
  );
}

/* ── Pulsing indicator light ── */
function PulseLight({ pos, color = GREEN }: { pos: [number, number, number]; color?: string }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.4;
  });
  return (
    <Sphere args={[0.05, 12, 8]} position={pos}>
      <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={0.8} />
    </Sphere>
  );
}

/* ─────────────────────────────────────────────────
   MECHANICAL LAB — gear train, robot arm, test rig
   ─────────────────────────────────────────────── */
function MechLab({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "TEST BAY");
  const armRef = useRef<THREE.Group>(null!);
  const arm2Ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (armRef.current) armRef.current.rotation.z = Math.sin(t * 0.7) * 0.35;
    if (arm2Ref.current) arm2Ref.current.rotation.z = Math.sin(t * 0.7 + 1.2) * 0.4;
  });
  return (
    <group>
      <fog attach="fog" args={["#090e1a", 10, 24]} />
      <Stars radius={30} depth={20} count={300} factor={2} fade />
      <Floor color="#0d1520" />
      {/* Forge glow from below the workbench */}
      <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#f5a524" distance={5} />
      {/* Back wall */}
      <mesh position={[0, 2.5, -3.5]} receiveShadow>
        <planeGeometry args={[9, 5.5]} />
        <meshStandardMaterial color="#111c30" roughness={0.8} />
      </mesh>
      {/* Workbench */}
      <RoundedBox args={[3.6, 0.14, 1.8]} radius={0.05} position={[0, 0.85, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.35} roughness={0.4} />
      </RoundedBox>
      {([ [-1.7,0.42,-0.8],[1.7,0.42,-0.8],[-1.7,0.42,0.8],[1.7,0.42,0.8] ] as [number,number,number][]).map((p,i)=>(
        <Cylinder key={i} args={[0.06,0.06,0.84,12]} position={p} castShadow>
          <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} />
        </Cylinder>
      ))}
      {/* Gear train */}
      <Gear pos={[-0.5, 1.5, -0.8]} radius={0.38} teeth={12} speed={0.8} />
      <Gear pos={[0.35, 1.5, -0.8]} radius={0.22} teeth={8} speed={-1.4} color={STEEL_LIGHT} />
      <Gear pos={[0.9, 1.5, -0.8]} radius={0.18} teeth={6} speed={1.9} />
      {/* Drive shaft */}
      <Cylinder args={[0.025, 0.025, 1.8, 8]} rotation={[0, 0, Math.PI / 2]} position={[0, 1.5, -0.8]}>
        <meshStandardMaterial color={STEEL} metalness={0.8} />
      </Cylinder>
      {/* Robot arm */}
      <group position={[1.5, 0.85, 0.2]}>
        <Cylinder args={[0.18, 0.22, 0.2, 16]} castShadow>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.7} />
        </Cylinder>
        <group ref={armRef} position={[0, 0.1, 0]}>
          <Box args={[0.14, 0.9, 0.14]} position={[0, 0.45, 0]} castShadow>
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
          </Box>
          <group ref={arm2Ref} position={[0, 0.9, 0]}>
            <Box args={[0.12, 0.65, 0.12]} position={[0.15, 0.3, 0]} rotation={[0,0,0.4]} castShadow>
              <meshStandardMaterial color={GOLD_DIM} metalness={0.7} />
            </Box>
            <Sphere args={[0.06, 10, 8]} position={[0.35, 0.55, 0]}>
              <meshStandardMaterial color={WARN_RED} emissive={WARN_RED} emissiveIntensity={0.8} />
            </Sphere>
          </group>
        </group>
      </group>
      {/* Pulley + hanging weight */}
      <group position={[-1.2, 2.2, 0.1]}>
        <Cylinder args={[0.3, 0.3, 0.1, 24]} rotation={[Math.PI/2,0,0]} castShadow>
          <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
        </Cylinder>
        <Cylinder args={[0.015, 0.015, 1.6, 8]} position={[0, -0.8, 0]}>
          <meshStandardMaterial color={STEEL_LIGHT} />
        </Cylinder>
        <RoundedBox args={[0.35, 0.35, 0.35]} radius={0.04} position={[0, -1.65, 0]} castShadow>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.5} />
        </RoundedBox>
      </group>
      {/* Tool rack */}
      <Box args={[0.04, 1.5, 0.06]} position={[-3.2, 1.5, -0.5]}>
        <meshStandardMaterial color={STEEL} metalness={0.6} />
      </Box>
      {[-0.7,-0.2,0.3,0.8].map((y,i) => (
        <Cylinder key={i} args={[0.02,0.02,0.4,8]} rotation={[0,0,Math.PI/2]} position={[-3.1,1.5+y,-0.5]}>
          <meshStandardMaterial color={i%2===0?GOLD:STEEL_LIGHT} metalness={0.7} />
        </Cylinder>
      ))}
      <PulseLight pos={[1.5, 2.2, 0.2]} color={GREEN} />
      <Label text={label} position={[0, 3.2, -3.2]} color={GOLD} size={0.32} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   CONSTRUCTION SITE — cranes, scaffold, hard hats
   ─────────────────────────────────────────────── */
function ConstructionSite({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "JOBSITE A");
  const craneRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (craneRef.current) craneRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.6;
  });
  return (
    <group>
      <Stars radius={40} depth={15} count={400} factor={2.5} fade />
      <Floor color="#1a1208" size={28} />
      <mesh position={[0, 2.5, -4]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#0e0a05" roughness={0.95} />
      </mesh>
      {/* Scaffold frame */}
      {[-1.8, 1.8].map((x) => (
        <group key={x}>
          <Box args={[0.14, 4.5, 0.14]} position={[x, 2.3, -1.5]} castShadow>
            <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.2} />
          </Box>
          <Box args={[0.14, 4.5, 0.14]} position={[x, 2.3, 0.5]} castShadow>
            <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.2} />
          </Box>
        </group>
      ))}
      {[1.0, 2.2, 3.4].map((y) => (
        <Box key={y} args={[3.8, 0.1, 2.2]} position={[0, y, -0.5]} castShadow>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.5} roughness={0.4} />
        </Box>
      ))}
      {/* Cross braces */}
      {[-0.5, 1.8].map((z, i) => (
        <Box key={i} args={[3.8, 0.08, 0.08]} position={[0, 1.5, z]} rotation={[0,0,0.35]} castShadow>
          <meshStandardMaterial color={STEEL} metalness={0.7} />
        </Box>
      ))}
      {/* Concrete slab being poured */}
      <RoundedBox args={[2.2, 0.2, 1.4]} radius={0.04} position={[0, 1.1, -0.5]} castShadow>
        <meshStandardMaterial color="#555f6e" roughness={0.95} />
      </RoundedBox>
      {/* Tower crane */}
      <group ref={craneRef} position={[3.5, 0, 0]}>
        <Cylinder args={[0.18, 0.22, 5.5, 12]} position={[0, 2.75, 0]} castShadow>
          <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.5} />
        </Cylinder>
        <Box args={[4.0, 0.12, 0.12]} position={[-1.0, 5.6, 0]} castShadow>
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
        </Box>
        <Box args={[1.5, 0.12, 0.12]} position={[1.1, 5.6, 0]} castShadow>
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
        </Box>
        <Cylinder args={[0.02, 0.02, 3.0, 6]} position={[-2.8, 4.1, 0]}>
          <meshStandardMaterial color={STEEL_LIGHT} />
        </Cylinder>
        <RoundedBox args={[0.5, 0.5, 0.4]} radius={0.04} position={[-2.8, 2.55, 0]} castShadow>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.5} />
        </RoundedBox>
      </group>
      {/* Hard hats on ground */}
      {([ [-2.5, 0.18, 1.2], [-0.8, 0.18, 1.8] ] as [number,number,number][]).map((p,i)=>(
        <group key={i} position={p}>
          <Sphere args={[0.22, 16, 12]} scale={[1,0.52,1]} castShadow>
            <meshStandardMaterial color={i===0?GOLD:WARN_RED} />
          </Sphere>
          <Cylinder args={[0.24, 0.24, 0.04, 18]} position={[0,-0.1,0]}>
            <meshStandardMaterial color={i===0?GOLD_DIM:"#991f1f"} />
          </Cylinder>
        </group>
      ))}
      <PulseLight pos={[3.5, 5.7, 0]} color={WARN_RED} />
      <Label text={label} position={[0, 5.2, -3.5]} color={GOLD} size={0.32} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   CIRCUIT BOARD — traces, ICs, blinking LEDs
   ─────────────────────────────────────────────── */
function CircuitBoard({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "PCB STATION");
  const ledRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    ledRefs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * (2 + i * 0.7) + i) * 0.35;
    });
  });
  return (
    <group>
      <fog attach="fog" args={["#001a12", 9, 22]} />
      <Stars radius={25} depth={15} count={500} factor={2} fade />
      <Floor color="#041010" size={20} />
      {/* Underbelly ambient glow */}
      <pointLight position={[0, 0.3, 0]} intensity={0.6} color="#00ff88" distance={6} />
      <pointLight position={[-2, 1.2, 0]} intensity={0.3} color="#3b82f6" distance={5} />
      <pointLight position={[2, 1.2, 0]} intensity={0.3} color="#22c55e" distance={5} />
      {/* Giant PCB board surface */}
      <RoundedBox args={[5, 0.12, 3.6]} radius={0.06} position={[0, 0.65, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#0a3d2e" metalness={0.25} roughness={0.5} />
      </RoundedBox>
      {/* Copper traces */}
      {[-1.6,-0.8,0,0.8,1.6].map((x,i) => (
        <Box key={`trace-h-${i}`} args={[0.04, 0.018, 2.8]} position={[x, 0.73, 0]}>
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} metalness={0.9} />
        </Box>
      ))}
      {[-1.2, -0.3, 0.4, 1.1].map((z,i) => (
        <Box key={`trace-v-${i}`} args={[3.2, 0.018, 0.04]} position={[0, 0.73, z]}>
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} metalness={0.9} />
        </Box>
      ))}
      {/* ICs */}
      {([ [-1.6,0.75,-0.9,0.6,0.25], [0,0.75,0.5,0.5,0.2], [1.2,0.75,-0.4,0.7,0.22], [-0.7,0.75,0.8,0.45,0.2] ] as number[][]).map((d,i) => (
        <group key={i} position={[d[0], d[1], d[2]]}>
          <RoundedBox args={[d[3], d[4], d[3]]} radius={0.02} castShadow>
            <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.6} />
          </RoundedBox>
          {Array.from({length:4}).map((_,j) => (
            <Box key={j} args={[0.02, 0.02, d[3]*0.5]} position={[-d[3]/2-0.01, 0, -d[3]/4+j*(d[3]/4)]}>
              <meshStandardMaterial color={STEEL_LIGHT} metalness={0.9} />
            </Box>
          ))}
        </group>
      ))}
      {/* LEDs */}
      {([ [-2.1,0.78,1.0,GREEN], [-1.0,0.78,1.3,WARN_RED], [0.5,0.78,1.0,GOLD], [1.8,0.78,-1.2,"#3b82f6"], [0.8,0.78,-1.0,GREEN] ] as [number,number,number,string][]).map(([x,y,z,c],i)=>(
        <Sphere key={i} args={[0.05,10,8]} position={[x,y,z]}>
          <meshStandardMaterial ref={el => { if(el) ledRefs.current[i]=el; }} color={c} emissive={c} emissiveIntensity={0.7} />
        </Sphere>
      ))}
      {/* Capacitors */}
      {[-1.8,1.6].map((x,i)=>(
        <Cylinder key={i} args={[0.09,0.09,0.28,16]} position={[x,0.88,-1.1]}>
          <meshStandardMaterial color="#374151" metalness={0.5} />
        </Cylinder>
      ))}
      {/* Oscilloscope screen */}
      <Box args={[1.2, 0.8, 0.08]} position={[2.8, 1.4, -0.5]} castShadow>
        <meshStandardMaterial color="#000" />
      </Box>
      <Box args={[1.1, 0.7, 0.02]} position={[2.8, 1.4, -0.45]}>
        <meshStandardMaterial color="#001a0a" emissive={GREEN} emissiveIntensity={0.25} />
      </Box>
      <Label text={label} position={[0, 2.5, -0.5]} color={GOLD} size={0.28} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   CHEM PLANT — reactors, pipes, pressure gauges
   ─────────────────────────────────────────────── */
function ChemPlant({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "REACTOR 2");
  const gaugeRef = useRef<THREE.Mesh>(null!);
  const bubbleRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (gaugeRef.current) gaugeRef.current.rotation.z = 0.4 + Math.sin(t * 0.6) * 0.8;
    bubbleRefs.current.forEach((b, i) => {
      if (!b) return;
      b.position.y = 0.9 + ((t * 0.4 + i * 0.33) % 1) * 1.8;
      b.scale.setScalar(0.4 + ((t * 0.4 + i * 0.33) % 1) * 0.6);
    });
  });
  return (
    <group>
      <Stars radius={30} depth={15} count={350} factor={2} fade />
      <Floor color="#0d1118" size={22} />
      <mesh position={[0, 3, -4]} receiveShadow>
        <planeGeometry args={[10, 7]} />
        <meshStandardMaterial color="#0a0e16" roughness={0.9} />
      </mesh>
      {/* Main reactor */}
      <Cylinder args={[0.85, 0.85, 3.5, 32]} position={[-1.4, 1.75, -0.5]} castShadow>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.85} roughness={0.2} />
      </Cylinder>
      <Sphere args={[0.85, 24, 16]} scale={[1,0.6,1]} position={[-1.4, 3.5, -0.5]}>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.85} roughness={0.2} />
      </Sphere>
      <Cylinder args={[0.15, 0.15, 0.6, 12]} position={[-1.4, 3.9, -0.5]}>
        <meshStandardMaterial color={STEEL} metalness={0.7} />
      </Cylinder>
      {/* Secondary tank */}
      <Cylinder args={[0.6, 0.6, 2.4, 28]} position={[1.2, 1.2, -0.2]} castShadow>
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.25} />
      </Cylinder>
      <Sphere args={[0.6, 20, 14]} scale={[1,0.55,1]} position={[1.2, 2.4, -0.2]}>
        <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.25} />
      </Sphere>
      {/* Connecting pipes */}
      {[ [[-1.4,2.0,-0.5],[1.2,2.0,-0.2]], [[-1.4,1.3,-0.5],[1.2,1.3,-0.2]] ].map((seg,i) => {
        const [a,b] = seg as [number[],number[]];
        const mid = [(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
        const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2];
        const len=Math.hypot(dx,dy,dz);
        return (
          <Cylinder key={i} args={[0.07,0.07,len,10]} position={mid as [number,number,number]}
            rotation={[0,Math.atan2(dx,dz),Math.atan2(dy,Math.hypot(dx,dz))-Math.PI/2]}>
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.2} />
          </Cylinder>
        );
      })}
      {/* Vertical steam pipe */}
      <Cylinder args={[0.08, 0.08, 2.0, 10]} position={[1.2, 3.5, -0.2]}>
        <meshStandardMaterial color={GOLD} metalness={0.7} />
      </Cylinder>
      {/* Bubbles in reactor */}
      {[0,1,2].map(i => (
        <Sphere key={i} ref={el => { if(el) bubbleRefs.current[i]=el; }}
          args={[0.06,8,6]} position={[-1.4, 0.9, -0.5]}>
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.7} />
        </Sphere>
      ))}
      {/* Pressure gauges */}
      {[[-1.4,2.5,0.38],[1.2,1.8,0.65]].map((p,gi)=>(
        <group key={gi} position={p as [number,number,number]}>
          <Cylinder args={[0.2,0.2,0.06,20]} rotation={[Math.PI/2,0,0]}>
            <meshStandardMaterial color={WHITE} />
          </Cylinder>
          <mesh ref={gi===0?gaugeRef:undefined} position={[0,0,0.04]}>
            <boxGeometry args={[0.18,0.02,0.02]}/>
            <meshStandardMaterial color={WARN_RED} />
          </mesh>
        </group>
      ))}
      {/* Valve wheels */}
      {[[-0.5,1.6,0.6],[2.0,1.4,0.5]].map((p,i)=>(
        <Torus key={i} args={[0.14,0.025,8,16]} position={p as [number,number,number]} rotation={[Math.PI/2,0,0]}>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.8} />
        </Torus>
      ))}
      <PulseLight pos={[-1.4, 4.2, -0.5]} color={GREEN} />
      <Label text={label} position={[0, 4.8, -3.5]} color={GOLD} size={0.3} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   FACTORY FLOOR — animated conveyor, robot arm
   ─────────────────────────────────────────────── */
function FactoryFloor({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "LINE 4");
  const boxRefs = useRef<THREE.Mesh[]>([]);
  const armJoint1 = useRef<THREE.Group>(null!);
  const armJoint2 = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    boxRefs.current.forEach((b, i) => {
      if (!b) return;
      b.position.x = ((-2.5 + ((t * 0.6 + i * 1.3) % 5.2)) % 5.2) - 2.5;
    });
    if (armJoint1.current) armJoint1.current.rotation.z = Math.sin(t * 0.8) * 0.4;
    if (armJoint2.current) armJoint2.current.rotation.z = Math.sin(t * 0.8 + 1.0) * 0.5;
  });
  return (
    <group>
      <Stars radius={30} depth={15} count={300} factor={2} fade />
      <Floor color="#111111" size={26} />
      <mesh position={[0,2.5,-4.5]} receiveShadow>
        <planeGeometry args={[10,6]}/>
        <meshStandardMaterial color="#0a0a0a" roughness={0.95}/>
      </mesh>
      {/* Conveyor belt */}
      <Box args={[5.5, 0.16, 1.0]} position={[0, 0.72, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.5} />
      </Box>
      {Array.from({length:8}).map((_,i)=>(
        <Cylinder key={i} args={[0.13,0.13,1.05,16]} rotation={[Math.PI/2,0,0]}
          position={[-2.4+i*0.7, 0.72, 0]} castShadow>
          <meshStandardMaterial color={GOLD_DIM} metalness={0.8} roughness={0.2} />
        </Cylinder>
      ))}
      {/* Animated boxes on conveyor */}
      {[0,1,2,3].map(i=>(
        <RoundedBox key={i} ref={(el:THREE.Mesh|null)=>{if(el)boxRefs.current[i]=el;}} args={[0.38,0.38,0.38]} radius={0.04}
          position={[-2.5+i*1.3, 1.07, 0]} castShadow>
          <meshStandardMaterial color={i%2===0?GOLD:STEEL_LIGHT} metalness={0.2} roughness={0.6}/>
        </RoundedBox>
      ))}
      {/* Animated robot arm */}
      <group position={[1.9, 0.88, 0.9]}>
        <Cylinder args={[0.18,0.22,0.22,16]} castShadow>
          <meshStandardMaterial color={NAVY_LIGHT} metalness={0.6} roughness={0.3}/>
        </Cylinder>
        <group ref={armJoint1} position={[0,0.11,0]}>
          <Box args={[0.14,0.85,0.14]} position={[0,0.42,0]} castShadow>
            <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.25}/>
          </Box>
          <Sphere args={[0.1,12,10]} position={[0,0.85,0]}>
            <meshStandardMaterial color={STEEL_LIGHT} metalness={0.8}/>
          </Sphere>
          <group ref={armJoint2} position={[0,0.85,0]}>
            <Box args={[0.12,0.65,0.12]} position={[0.12,0.3,0]} rotation={[0,0,0.3]} castShadow>
              <meshStandardMaterial color={GOLD_DIM} metalness={0.7}/>
            </Box>
            <Box args={[0.18,0.04,0.14]} position={[0.28,0.6,0]}>
              <meshStandardMaterial color={WARN_RED} emissive={WARN_RED} emissiveIntensity={0.4}/>
            </Box>
          </group>
        </group>
      </group>
      {/* Side machinery */}
      <Box args={[1.0,2.2,0.7]} position={[-3.5,1.1,-0.8]} castShadow>
        <meshStandardMaterial color="#1a1a1a" metalness={0.4}/>
      </Box>
      {[0.5,0.9,1.3,1.7].map((y,i)=>(
        <Box key={i} args={[0.85,0.04,0.02]} position={[-3.5,y,-0.44]}>
          <meshStandardMaterial color={i%3===0?GREEN:GOLD} emissive={i%3===0?GREEN:GOLD} emissiveIntensity={0.6}/>
        </Box>
      ))}
      <Gear pos={[-3.5, 2.4, -0.8]} radius={0.28} teeth={10} speed={1.2} color={STEEL_LIGHT} />
      <PulseLight pos={[1.9, 2.0, 0.9]} color={GREEN} />
      <Label text={label} position={[0, 3.4, -4.0]} color={GOLD} size={0.3} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   OFFICE DESK — monitor, charts, coffee
   ─────────────────────────────────────────────── */
function OfficeDesk({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "WORKSPACE");
  const barRefs = useRef<THREE.Mesh[]>([]);
  const cursorRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    barRefs.current.forEach((b, i) => {
      if (!b) return;
      const targetH = 0.08 + (Math.sin(t * 0.4 + i * 0.9) * 0.5 + 0.5) * 0.32;
      b.scale.y = THREE.MathUtils.lerp(b.scale.y, targetH / 0.08, 0.04);
      b.position.y = 1.57 + (b.scale.y * 0.08) / 2;
    });
    if (cursorRef.current) {
      cursorRef.current.position.x = -0.35 + Math.sin(t * 0.5) * 0.3;
      cursorRef.current.position.y = 1.58 + Math.cos(t * 0.4) * 0.08;
    }
  });
  return (
    <group>
      <Stars radius={25} depth={10} count={200} factor={1.5} fade />
      <Floor color="#0a1020" size={18} />
      {/* Desk surface */}
      <RoundedBox args={[3.6, 0.12, 1.6]} radius={0.05} position={[0, 0.87, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2d1f0e" roughness={0.6} />
      </RoundedBox>
      {([ [-1.7,0.43,-0.7],[1.7,0.43,-0.7],[-1.7,0.43,0.7],[1.7,0.43,0.7] ] as [number,number,number][]).map((p,i)=>(
        <Cylinder key={i} args={[0.04,0.04,0.86,8]} position={p} castShadow>
          <meshStandardMaterial color="#4a3520" roughness={0.7} />
        </Cylinder>
      ))}
      {/* Monitor */}
      <Box args={[2.0, 1.2, 0.07]} position={[0, 1.63, -0.55]} castShadow>
        <meshStandardMaterial color="#111" />
      </Box>
      <RoundedBox args={[0.12, 0.45, 0.12]} radius={0.04} position={[0, 1.06, -0.55]}>
        <meshStandardMaterial color="#222" />
      </RoundedBox>
      <Box args={[0.55, 0.06, 0.32]} position={[0, 0.9, -0.55]}>
        <meshStandardMaterial color="#222" />
      </Box>
      {/* Screen content */}
      <Box args={[1.88, 1.08, 0.01]} position={[0, 1.63, -0.5]}>
        <meshStandardMaterial color="#0d1b33" emissive="#0d1b33" emissiveIntensity={0.8} />
      </Box>
      {/* Animated bar chart on screen */}
      {[-0.5,-0.25,0,0.25,0.5].map((x,i)=>(
        <mesh key={i} ref={(el:THREE.Mesh|null)=>{if(el)barRefs.current[i]=el;}} position={[x,1.57,-0.48]}>
          <boxGeometry args={[0.14,0.08,0.01]}/>
          <meshStandardMaterial color={i===2?GOLD:"#3b82f6"} emissive={i===2?GOLD:"#1d4ed8"} emissiveIntensity={0.5}/>
        </mesh>
      ))}
      <mesh ref={cursorRef} position={[-0.35,1.58,-0.48]}>
        <boxGeometry args={[0.04,0.1,0.01]}/>
        <meshStandardMaterial color={WHITE} emissive={WHITE} emissiveIntensity={0.9}/>
      </mesh>
      {/* Keyboard */}
      <RoundedBox args={[1.3,0.04,0.44]} radius={0.02} position={[0,0.95,0.25]} castShadow>
        <meshStandardMaterial color="#1e293b" />
      </RoundedBox>
      {/* Mouse */}
      <RoundedBox args={[0.14,0.04,0.2]} radius={0.03} position={[0.8,0.95,0.25]} castShadow>
        <meshStandardMaterial color="#1e293b" />
      </RoundedBox>
      {/* Coffee mug */}
      <Cylinder args={[0.1,0.12,0.22,18]} position={[1.4,1.0,0.3]} castShadow>
        <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.6} />
      </Cylinder>
      <Cylinder args={[0.08,0.08,0.16,18]} position={[1.4,1.11,0.3]}>
        <meshStandardMaterial color="#3b1a00" />
      </Cylinder>
      {/* Sticky notes */}
      {[[-1.2,1.04,0.4],[1.0,1.04,-0.3]].map((p,i)=>(
        <Box key={i} args={[0.28,0.03,0.28]} position={p as [number,number,number]} castShadow>
          <meshStandardMaterial color={i===0?"#fef08a":"#bbf7d0"} />
        </Box>
      ))}
      {/* Second monitor (side) */}
      <Box args={[1.6,1.0,0.07]} position={[-2.3,1.57,-0.55]} rotation={[0,0.4,0]} castShadow>
        <meshStandardMaterial color="#111" />
      </Box>
      <Box args={[1.48,0.88,0.01]} position={[-2.25,1.57,-0.5]} rotation={[0,0.4,0]}>
        <meshStandardMaterial color="#0d1b33" emissive="#1e3a5f" emissiveIntensity={0.6} />
      </Box>
      <Label text={label} position={[0, 3.0, -0.5]} color={GOLD} size={0.28} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   HOSPITAL ROOM — bed, monitors, IV, vitals
   ─────────────────────────────────────────────── */
function HospitalRoom({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "BED 3");
  const lineRef = useRef<THREE.Group>(null!);
  const alarmRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (lineRef.current) lineRef.current.position.x = (t * 0.3) % 0.7;
    if (alarmRef.current) alarmRef.current.emissiveIntensity = 0.3 + Math.sin(t * 4) * 0.25;
  });
  return (
    <group>
      <Floor color="#0e1620" size={20} />
      <mesh position={[0,1.6,-3.5]} receiveShadow>
        <planeGeometry args={[8,4.5]}/>
        <meshStandardMaterial color="#e8eff7" roughness={0.95}/>
      </mesh>
      <mesh position={[-4,1.6,0]} rotation={[0,Math.PI/2,0]} receiveShadow>
        <planeGeometry args={[7,4.5]}/>
        <meshStandardMaterial color="#d6e4f0" roughness={0.95}/>
      </mesh>
      {/* Hospital bed */}
      <RoundedBox args={[2.5,0.22,1.1]} radius={0.06} position={[0,0.55,0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f0f4f8" roughness={0.7}/>
      </RoundedBox>
      {/* Head/foot boards */}
      <Box args={[2.5,0.7,0.08]} position={[0,0.9,-0.56]} castShadow>
        <meshStandardMaterial color="#c8d6e8" metalness={0.3}/>
      </Box>
      <Box args={[2.5,0.5,0.08]} position={[0,0.76,0.56]} castShadow>
        <meshStandardMaterial color="#c8d6e8" metalness={0.3}/>
      </Box>
      {/* Bed rails */}
      {[-1.2,1.2].map((x,i)=>(
        <Box key={i} args={[0.06,0.3,1.2]} position={[x,0.8,0]} castShadow>
          <meshStandardMaterial color={STEEL} metalness={0.7}/>
        </Box>
      ))}
      {/* Pillow + blanket */}
      <RoundedBox args={[0.7,0.1,0.5]} radius={0.06} position={[-0.7,0.7,0]} castShadow>
        <meshStandardMaterial color="#fff" roughness={0.9}/>
      </RoundedBox>
      <RoundedBox args={[1.6,0.06,0.8]} radius={0.04} position={[0.3,0.68,0.1]} castShadow>
        <meshStandardMaterial color="#bfd7ea" roughness={0.85}/>
      </RoundedBox>
      {/* IV pole + bag */}
      <Cylinder args={[0.025,0.025,2.2,10]} position={[-1.7,1.1,-0.4]} castShadow>
        <meshStandardMaterial color={STEEL} metalness={0.8}/>
      </Cylinder>
      <Box args={[0.22,0.36,0.1]} position={[-1.7,2.0,-0.4]} castShadow>
        <meshStandardMaterial color={"#d4eaf7"} transparent opacity={0.85}/>
      </Box>
      <Cylinder args={[0.015,0.015,0.8,8]} position={[-1.7,1.28,-0.4]} rotation={[0.15,0,0.08]}>
        <meshStandardMaterial color={WHITE} transparent opacity={0.7}/>
      </Cylinder>
      {/* Vitals monitor */}
      <Box args={[0.8,0.58,0.07]} position={[1.6,1.6,-0.3]} castShadow>
        <meshStandardMaterial color="#1a1a1a"/>
      </Box>
      <Box args={[0.74,0.52,0.01]} position={[1.6,1.6,-0.25]}>
        <meshStandardMaterial color="#001a00" emissive={GREEN} emissiveIntensity={0.2}/>
      </Box>
      {/* ECG line */}
      <group ref={lineRef} position={[1.3,1.65,-0.24]}>
        {[0,0.1,0.2].map(ox=>(
          <Box key={ox} args={[0.04,0.3,0.01]} position={[ox,0,0]}>
            <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.9}/>
          </Box>
        ))}
      </group>
      {/* Alarm light */}
      <Sphere args={[0.05,10,8]} position={[1.6,2.0,-0.25]}>
        <meshStandardMaterial ref={alarmRef} color={WARN_RED} emissive={WARN_RED} emissiveIntensity={0.5}/>
      </Sphere>
      <Cylinder args={[0.04,0.04,1.4,10]} position={[1.6,0.93,-0.3]}>
        <meshStandardMaterial color={STEEL} metalness={0.6}/>
      </Cylinder>
      {/* Overhead surgical light */}
      <Cylinder args={[0.35,0.2,0.12,24]} position={[0,2.8,0]}>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.7}/>
      </Cylinder>
      <Sphere args={[0.28,18,14]} position={[0,2.66,0]}>
        <meshStandardMaterial color={WHITE} emissive={WHITE} emissiveIntensity={0.4}/>
      </Sphere>
      <Label text={label} position={[0,3.3,-3.2]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   SERVER ROOM — racks, blinking LEDs, cables
   ─────────────────────────────────────────────── */
function ServerRoom({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "RACK 7");
  const ledRefs2 = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    ledRefs2.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = Math.random() > 0.98 ? 0 : 0.5 + Math.sin(clock.elapsedTime * (1.5 + i * 0.3) + i * 1.3) * 0.35;
    });
  });
  return (
    <group>
      <fog attach="fog" args={["#00050f", 7, 20]} />
      <Stars radius={20} depth={10} count={300} factor={1.5} fade />
      <Floor color="#080a12" size={18} />
      {/* Rack ambient lights — blue/cyan data-center glow */}
      <pointLight position={[-2.1, 0.8, 0.4]} intensity={0.4} color="#3b82f6" distance={4} />
      <pointLight position={[2.1, 0.8, 0.4]} intensity={0.4} color="#22d3ee" distance={4} />
      <pointLight position={[0, 2.2, 0.4]} intensity={0.25} color="#6366f1" distance={6} />
      <mesh position={[0,2,-3.5]} receiveShadow>
        <planeGeometry args={[8,5]}/>
        <meshStandardMaterial color="#0a0c18" roughness={0.95}/>
      </mesh>
      {/* Server racks */}
      {[-2.1,-0.7,0.7,2.1].map((x,ri)=>(
        <group key={ri} position={[x,1.35,-0.6]}>
          <Box args={[1.0,2.8,0.7]} castShadow>
            <meshStandardMaterial color="#090d1a" metalness={0.5} roughness={0.5}/>
          </Box>
          {/* Server units */}
          {Array.from({length:10}).map((_,j)=>(
            <group key={j} position={[0,-1.3+j*0.28,0.36]}>
              <Box args={[0.85,0.2,0.02]}>
                <meshStandardMaterial color="#111827" roughness={0.6}/>
              </Box>
              {[0,1,2].map(li=>(
                <Sphere key={li} args={[0.025,6,5]} position={[-0.3+li*0.12, 0, 0.02]}>
                  <meshStandardMaterial
                    ref={(el:THREE.MeshStandardMaterial|null)=>{if(el)ledRefs2.current[ri*30+j*3+li]=el;}}
                    color={li===0?GREEN:li===1?GOLD:WARN_RED}
                    emissive={li===0?GREEN:li===1?GOLD:WARN_RED}
                    emissiveIntensity={0.7}
                  />
                </Sphere>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* Cable tray overhead */}
      <Box args={[9,0.08,0.3]} position={[0,2.85,-0.6]}>
        <meshStandardMaterial color={STEEL} metalness={0.7}/>
      </Box>
      {/* Hanging cables */}
      {[-2,-1,0,1,2].map((x,i)=>(
        <Cylinder key={i} args={[0.02,0.02,0.8+(i%3)*0.15,6]} position={[x,2.44+i*0.02,-0.6]} rotation={[0.05*(i-2),0,0]}>
          <meshStandardMaterial color={i%2===0?"#3b82f6":"#22c55e"} />
        </Cylinder>
      ))}
      {/* UPS on floor */}
      <Box args={[0.8,0.7,0.6]} position={[3.0,0.35,-0.5]} castShadow>
        <meshStandardMaterial color="#1f2937" metalness={0.4}/>
      </Box>
      <PulseLight pos={[3.0,0.75,-0.18]} color={GREEN}/>
      <Label text={label} position={[0,3.3,-3.2]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   DATA VIZ — holographic floating charts
   ─────────────────────────────────────────────── */
function DataViz({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "DASHBOARD");
  const barHeights = useMemo(() => [0.55, 1.3, 0.8, 1.75, 1.0, 1.95, 1.4], []);
  const panelRef = useRef<THREE.Group>(null!);
  const barRefs2 = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (panelRef.current) panelRef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    barRefs2.current.forEach((b, i) => {
      if (!b) return;
      const target = barHeights[i] + Math.sin(t * 0.6 + i) * 0.15;
      const cur = b.scale.y;
      b.scale.y = THREE.MathUtils.lerp(cur, target, 0.03);
      b.position.y = b.scale.y / 2 + 0.7;
    });
  });
  return (
    <group>
      <fog attach="fog" args={["#02040c", 10, 26]} />
      <Stars radius={40} depth={25} count={600} factor={3} fade />
      <Floor color="#04060e" size={22} />
      {/* Holographic ambient glow */}
      <pointLight position={[0, 2.5, -0.8]} intensity={0.5} color="#6366f1" distance={7} />
      <pointLight position={[-2, 1, 0]} intensity={0.25} color="#22d3ee" distance={5} />
      <group ref={panelRef} position={[0,0,0]}>
        {/* Floating panel */}
        <Float speed={0.6} rotationIntensity={0.06} floatIntensity={0.2}>
          <RoundedBox args={[4.5,2.8,0.08]} radius={0.08} position={[0,2.2,-0.8]} castShadow>
            <meshStandardMaterial color={NAVY_LIGHT} metalness={0.2} transparent opacity={0.85}/>
          </RoundedBox>
          <Box args={[4.3,2.6,0.02]} position={[0,2.2,-0.75]}>
            <meshStandardMaterial color="#030712" emissive="#1e3a5f" emissiveIntensity={0.3}/>
          </Box>
          {/* Panel title */}
          <Label text="CAREER PERFORMANCE ANALYTICS" position={[0,3.35,-0.7]} color={GOLD} size={0.16}/>
        </Float>
        {/* 3D Bar chart */}
        {barHeights.map((h, i) => (
          <mesh key={i} ref={(el:THREE.Mesh|null)=>{if(el)barRefs2.current[i]=el;}}
            position={[-1.5+i*0.5, h/2+0.7, 0]}>
            <boxGeometry args={[0.3, h, 0.3]}/>
            <meshStandardMaterial
              color={i===5?GOLD:"#3b82f6"}
              emissive={i===5?GOLD:"#1d4ed8"}
              emissiveIntensity={0.4}
              metalness={0.3}
            />
          </mesh>
        ))}
        {/* Trend line */}
        {barHeights.slice(1).map((h, i) => {
          const x1=-1.5+i*0.5, x2=-1.5+(i+1)*0.5;
          const y1=barHeights[i]+0.7, y2=h+0.7;
          const dx=x2-x1, dy=y2-y1;
          const len=Math.hypot(dx,dy);
          const ang=Math.atan2(dy,dx);
          return (
            <mesh key={`t${i}`} position={[(x1+x2)/2,(y1+y2)/2,-0.1]} rotation={[0,0,ang]}>
              <boxGeometry args={[len,0.035,0.035]}/>
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.7}/>
            </mesh>
          );
        })}
        {/* Pie/ring chart */}
        <Torus args={[0.45,0.2,16,32,Math.PI*1.5]} position={[2.6,1.3,0.3]} rotation={[-Math.PI/2,0,0]}>
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.4}/>
        </Torus>
        <Torus args={[0.45,0.2,16,32,Math.PI*0.5]} position={[2.6,1.3,0.3]} rotation={[-Math.PI/2,0,1.5]}>
          <meshStandardMaterial color={"#3b82f6"} emissive={"#1d4ed8"} emissiveIntensity={0.4}/>
        </Torus>
      </group>
      <Label text={label} position={[0,4.0,-0.7]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   COURTROOM — judge bench, gallery, scales
   ─────────────────────────────────────────────── */
function Courtroom({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "COURTROOM 4B");
  const scalesRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (scalesRef.current) scalesRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.12;
  });
  return (
    <group>
      <Floor color="#1a1205" size={22} />
      {/* Walls */}
      <mesh position={[0,2.5,-4.5]} receiveShadow>
        <planeGeometry args={[10,6]}/>
        <meshStandardMaterial color="#2c1e0a" roughness={0.9}/>
      </mesh>
      <mesh position={[-4.5,2.5,0]} rotation={[0,Math.PI/2,0]} receiveShadow>
        <planeGeometry args={[10,6]}/>
        <meshStandardMaterial color="#281b08" roughness={0.9}/>
      </mesh>
      {/* Wooden floor */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]} receiveShadow>
        <planeGeometry args={[22,22]}/>
        <meshStandardMaterial color="#3b2410" roughness={0.8}/>
      </mesh>
      {/* Judge bench — elevated */}
      <Box args={[4.5,0.4,0.9]} position={[0,1.2,-3.0]} castShadow>
        <meshStandardMaterial color="#3b1f0e" roughness={0.5}/>
      </Box>
      <Box args={[4.7,1.2,0.8]} position={[0,0.6,-3.2]} castShadow>
        <meshStandardMaterial color="#3b1f0e" roughness={0.55}/>
      </Box>
      <Box args={[4.8,0.12,1.0]} position={[0,1.42,-3.1]}>
        <meshStandardMaterial color={GOLD_DIM} metalness={0.5}/>
      </Box>
      {/* Flag */}
      <Cylinder args={[0.025,0.025,2.0,8]} position={[2.4,1.0,-3.5]}>
        <meshStandardMaterial color={GOLD_DIM} metalness={0.7}/>
      </Cylinder>
      <Box args={[0.55,0.35,0.02]} position={[2.12,1.9,-3.5]}>
        <meshStandardMaterial color={"#b91c1c"}/>
      </Box>
      {/* Witness stand */}
      <RoundedBox args={[1.2,0.9,0.9]} radius={0.05} position={[-2.0,0.5,-1.0]} castShadow>
        <meshStandardMaterial color="#3b1f0e" roughness={0.55}/>
      </RoundedBox>
      <Box args={[1.2,0.06,0.9]} position={[-2.0,0.96,-1.0]}>
        <meshStandardMaterial color={GOLD_DIM} metalness={0.4}/>
      </Box>
      {/* Counsel tables */}
      {[-1.0,1.0].map((x,i)=>(
        <group key={i} position={[x,0,0.5]}>
          <RoundedBox args={[1.8,0.1,0.7]} radius={0.04} position={[0,0.88,0]} castShadow>
            <meshStandardMaterial color="#3b1f0e" roughness={0.5}/>
          </RoundedBox>
          {([ [-0.8,0.43,-0.3],[0.8,0.43,-0.3],[-0.8,0.43,0.3],[0.8,0.43,0.3] ] as [number,number,number][]).map((p,j)=>(
            <Cylinder key={j} args={[0.03,0.03,0.86,8]} position={p} castShadow>
              <meshStandardMaterial color="#4a2e12" roughness={0.7}/>
            </Cylinder>
          ))}
          {/* Papers */}
          <Box args={[0.5,0.02,0.35]} position={[i===0?-0.3:0.3,0.95,0]} castShadow>
            <meshStandardMaterial color={WHITE}/>
          </Box>
        </group>
      ))}
      {/* Gavel */}
      <group position={[0.6,1.52,-3.0]}>
        <Cylinder args={[0.055,0.055,0.4,12]} rotation={[0,0,Math.PI/2]} castShadow>
          <meshStandardMaterial color="#5a3e22" roughness={0.4}/>
        </Cylinder>
        <Cylinder args={[0.1,0.1,0.22,14]} position={[0.22,0,0]} rotation={[0,0,Math.PI/2]} castShadow>
          <meshStandardMaterial color="#3b2410" roughness={0.4}/>
        </Cylinder>
      </group>
      {/* Scales of justice */}
      <group ref={scalesRef} position={[-1.4,2.2,-3.0]}>
        <Cylinder args={[0.03,0.03,1.0,8]} position={[0,-0.5,0]}>
          <meshStandardMaterial color={GOLD} metalness={0.8}/>
        </Cylinder>
        <Box args={[0.7,0.03,0.03]} position={[0,0,0]}>
          <meshStandardMaterial color={GOLD} metalness={0.8}/>
        </Box>
        {[-0.35,0.35].map((x,i)=>(
          <group key={i} position={[x,-0.18+i*0.06,0]}>
            <Cylinder args={[0.015,0.015,0.35,6]}>
              <meshStandardMaterial color={GOLD} metalness={0.8}/>
            </Cylinder>
            <Sphere args={[0.12,12,8]} position={[0,-0.22,0]} scale={[1,0.5,1]}>
              <meshStandardMaterial color={GOLD_DIM} metalness={0.6}/>
            </Sphere>
          </group>
        ))}
      </group>
      {/* Gallery benches */}
      {[1.5,2.2,2.9].map((z,i)=>(
        <Box key={i} args={[4.0,0.3,0.6]} position={[0,0.45,z]} castShadow>
          <meshStandardMaterial color="#3b1f0e" roughness={0.6}/>
        </Box>
      ))}
      <Label text={label} position={[0,3.5,-4.2]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   KITCHEN — stove, flames, plating
   ─────────────────────────────────────────────── */
function Kitchen({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "PASS");
  const flameRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const steamRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flameRefs.current.forEach((m, i) => {
      if (m) { m.emissiveIntensity = 0.5 + Math.sin(t * (8 + i * 2.3) + i) * 0.35; }
    });
    steamRefs.current.forEach((s, i) => {
      if (!s) return;
      s.position.y = 0.08 + ((t * 0.3 + i * 0.5) % 0.6);
      s.scale.setScalar(0.3 + ((t * 0.3 + i * 0.5) % 0.6) * 0.7);
      (s.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.5 - ((t * 0.3 + i * 0.5) % 0.6) * 0.8);
    });
  });
  return (
    <group>
      <Floor color="#111" size={20} />
      <mesh position={[0,2,-3.5]} receiveShadow>
        <planeGeometry args={[8,5]}/>
        <meshStandardMaterial color="#e2e8f0" roughness={0.95}/>
      </mesh>
      {/* Stainless counters */}
      <RoundedBox args={[4.5,0.14,1.0]} radius={0.05} position={[0,0.93,0]} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.8} roughness={0.2}/>
      </RoundedBox>
      {/* Commercial range */}
      <RoundedBox args={[2.2,0.95,1.1]} radius={0.05} position={[-1.1,0.47,-0.05]} castShadow>
        <meshStandardMaterial color={STEEL} metalness={0.75} roughness={0.25}/>
      </RoundedBox>
      {/* Burners */}
      {([ [-1.6,1.0,-0.25],[-0.6,1.0,-0.25],[-1.6,1.0,0.3],[-0.6,1.0,0.3] ] as [number,number,number][]).map((p,i)=>(
        <group key={i} position={p}>
          <Cylinder args={[0.14,0.14,0.04,20]}>
            <meshStandardMaterial color="#333" metalness={0.7}/>
          </Cylinder>
          <Cylinder args={[0.1,0.1,0.04,16]} position={[0,0.04,0]}>
            <meshStandardMaterial ref={el=>{if(el)flameRefs.current[i]=el;}}
              color={i<2?"#f97316":"#1f2937"}
              emissive={i<2?"#ef4444":"#000"}
              emissiveIntensity={i<2?0.7:0}
            />
          </Cylinder>
          {i<2 && (
            <Cone args={[0.08,0.18,8]} position={[0,0.14,0]}>
              <meshStandardMaterial color="#f97316" emissive="#fbbf24" emissiveIntensity={0.6} transparent opacity={0.8}/>
            </Cone>
          )}
        </group>
      ))}
      {/* Pans */}
      <Cylinder args={[0.32,0.32,0.08,24]} position={[-1.6,1.06,-0.25]}>
        <meshStandardMaterial color="#1f2937" metalness={0.7}/>
      </Cylinder>
      <Cylinder args={[0.25,0.25,0.06,20]} position={[-0.6,1.06,-0.25]}>
        <meshStandardMaterial color="#1f2937" metalness={0.7}/>
      </Cylinder>
      {/* Steam from pans */}
      {[0,1,2].map(i=>(
        <Sphere key={i} ref={el=>{if(el)steamRefs.current[i]=el;}}
          args={[0.06,8,6]} position={[-1.6,1.14,-0.25]}>
          <meshStandardMaterial color={WHITE} transparent opacity={0.4}/>
        </Sphere>
      ))}
      {/* Overhead hood */}
      <Box args={[2.4,0.5,1.2]} position={[-1.1,2.25,-0.05]}>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.75} roughness={0.25}/>
      </Box>
      {/* Pass window / plating area */}
      <RoundedBox args={[1.8,0.14,0.9]} radius={0.04} position={[1.2,0.93,0]} castShadow>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.7}/>
      </RoundedBox>
      {/* Plates */}
      {[0.4, 1.2, 2.0].map((x,i)=>(
        <group key={i} position={[x,1.0,0.1]}>
          <Cylinder args={[0.22,0.22,0.03,24]}>
            <meshStandardMaterial color={WHITE} roughness={0.7}/>
          </Cylinder>
          <Sphere args={[0.08,10,8]} scale={[1,0.5,1]} position={[-0.04,0.04,0]}>
            <meshStandardMaterial color={i===0?GOLD:i===1?"#15803d":"#c2410c"}/>
          </Sphere>
          <Sphere args={[0.06,8,7]} scale={[1,0.5,1]} position={[0.06,0.04,-0.04]}>
            <meshStandardMaterial color={i===0?"#d97706":i===1?"#15803d":"#9a3412"}/>
          </Sphere>
        </group>
      ))}
      <PulseLight pos={[0,1.85,0]} color={GREEN}/>
      <Label text={label} position={[0,3.2,-3.2]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   ROOFTOP SOLAR — panels, sun, energy flow
   ─────────────────────────────────────────────── */
function RooftopSolar({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "ROOF ARRAY");
  const sunRef = useRef<THREE.Mesh>(null!);
  const energyRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sunRef.current) {
      sunRef.current.position.set(2.5 + Math.sin(t * 0.1) * 0.3, 3.5 + Math.cos(t * 0.1) * 0.2, -2.5);
      (sunRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.1;
    }
    energyRefs.current.forEach((e, i) => {
      if (!e) return;
      e.position.x = ((t * 0.5 + i * 0.4) % 3.5) - 1.0;
      (e.material as THREE.MeshStandardMaterial).opacity = 0.6 + Math.sin(t * 2 + i) * 0.3;
    });
  });
  return (
    <group>
      <Stars radius={50} depth={30} count={500} factor={3} fade />
      <Floor color="#1a1510" size={26} />
      {/* Roof */}
      <Box args={[6,0.25,4.5]} position={[0,0.12,0]} receiveShadow>
        <meshStandardMaterial color="#5a4a3a" roughness={0.9}/>
      </Box>
      {/* Solar panels — 3x2 grid with tilt */}
      {[-1.5,0,1.5].map(x => [-0.9,0.5].map(z => (
        <group key={`${x}-${z}`} position={[x,0.25,z]} rotation={[-0.3,0,0]}>
          <Box args={[1.25,0.05,1.05]} castShadow>
            <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.3}/>
          </Box>
          {/* Cell grid */}
          {[-0.4,0,0.4].map(dx => [-0.35,0.35].map(dz => (
            <Box key={`${dx}-${dz}`} args={[0.38,0.01,0.42]} position={[dx,0.03,dz]}>
              <meshStandardMaterial color="#1e40af" metalness={0.7}/>
            </Box>
          )))}
          {/* Silver wires */}
          {[-0.2,0.2].map(dx => (
            <Box key={dx} args={[0.015,0.02,1.0]} position={[dx,0.04,0]}>
              <meshStandardMaterial color={STEEL_LIGHT} metalness={0.9}/>
            </Box>
          ))}
        </group>
      )))}
      {/* Inverter box */}
      <Box args={[0.5,0.7,0.3]} position={[-2.8,0.6,-1.5]} castShadow>
        <meshStandardMaterial color="#1f2937" metalness={0.4}/>
      </Box>
      {/* Energy flow particles */}
      {[0,1,2,3].map(i=>(
        <mesh key={i} ref={el=>{if(el)energyRefs.current[i]=el;}} position={[-1.0+i*0.9,0.35,-1.5]}>
          <sphereGeometry args={[0.04,8,6]}/>
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.0} transparent opacity={0.7}/>
        </mesh>
      ))}
      {/* Sun */}
      <mesh ref={sunRef} position={[2.5,3.5,-2.5]}>
        <sphereGeometry args={[0.4,24,16]}/>
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.9}/>
      </mesh>
      <PulseLight pos={[-2.8,1.05,-1.5]} color={GREEN}/>
      <Label text={label} position={[0,2.8,-0.5]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   WIND TURBINE — spinning blades, green field
   ─────────────────────────────────────────────── */
function WindTurbine({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "TURBINE 12");
  const hubRef = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (hubRef.current) hubRef.current.rotation.z += dt * 1.2;
  });
  return (
    <group>
      <Stars radius={60} depth={30} count={600} factor={3.5} fade />
      <Floor color="#0a1a0a" size={30} />
      {/* Rolling hills (back) */}
      {[-4,0,4].map((x,i)=>(
        <Sphere key={i} args={[2.5,16,10]} position={[x,-1.8,-4+i*0.5]} scale={[1,0.5,0.6]}>
          <meshStandardMaterial color="#134e13" roughness={0.95}/>
        </Sphere>
      ))}
      {/* Turbine tower */}
      <Cylinder args={[0.22,0.35,6.0,20]} position={[0,3.0,0]} castShadow>
        <meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.5}/>
      </Cylinder>
      {/* Nacelle */}
      <RoundedBox args={[0.7,0.45,1.4]} radius={0.06} position={[0,6.1,0.3]} castShadow>
        <meshStandardMaterial color="#f3f4f6" metalness={0.3} roughness={0.5}/>
      </RoundedBox>
      {/* Spinner hub + blades */}
      <group ref={hubRef} position={[0,6.1,1.05]}>
        <Sphere args={[0.2,16,12]}>
          <meshStandardMaterial color={STEEL_LIGHT} metalness={0.7}/>
        </Sphere>
        {[0,120,240].map(deg=>{
          const rad=(deg*Math.PI)/180;
          return (
            <group key={deg} rotation={[0,0,rad]}>
              <Box args={[0.1,2.6,0.06]} position={[0,1.4,0]} castShadow>
                <meshStandardMaterial color="#f9fafb" metalness={0.2} roughness={0.5}/>
              </Box>
              {/* Blade tip light */}
              <Sphere args={[0.04,8,6]} position={[0,2.65,0]}>
                <meshStandardMaterial color={WARN_RED} emissive={WARN_RED} emissiveIntensity={0.8}/>
              </Sphere>
            </group>
          );
        })}
      </group>
      {/* Control shack */}
      <Box args={[1.2,1.0,1.0]} position={[-2.8,0.5,0]} castShadow>
        <meshStandardMaterial color="#374151" roughness={0.7}/>
      </Box>
      <Box args={[1.2,0.06,1.0]} position={[-2.8,1.04,0]}>
        <meshStandardMaterial color="#4b5563" roughness={0.6}/>
      </Box>
      {/* Wind direction vane */}
      <Cylinder args={[0.02,0.02,1.0,8]} position={[-2.8,1.8,0]}>
        <meshStandardMaterial color={STEEL} metalness={0.8}/>
      </Cylinder>
      <Cone args={[0.1,0.25,8]} position={[-2.8,2.35,0]}>
        <meshStandardMaterial color={WARN_RED}/>
      </Cone>
      <PulseLight pos={[0,6.8,1.05]} color={WARN_RED}/>
      <Label text={label} position={[0,0.5,0]} color={GOLD} size={0.28}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   SPA / AESTHETICS — treatment table, soft lights
   ─────────────────────────────────────────────── */
function Spa({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "TREATMENT 1");
  const candleRefs = useRef<THREE.PointLight[]>([]);
  useFrame(({ clock }) => {
    candleRefs.current.forEach((l, i) => {
      if (l) l.intensity = 0.3 + Math.sin(clock.elapsedTime * (3 + i * 1.5) + i * 2) * 0.12;
    });
  });
  return (
    <group>
      <Floor color="#0d0d12" size={18} />
      <mesh position={[0,2,-3.5]} receiveShadow>
        <planeGeometry args={[8,5]}/>
        <meshStandardMaterial color="#1a1225" roughness={0.95}/>
      </mesh>
      {/* Treatment table */}
      <RoundedBox args={[2.2,0.18,0.85]} radius={0.06} position={[0,0.87,0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2d1f35" roughness={0.7}/>
      </RoundedBox>
      {([ [-1.0,0.43,-0.38],[1.0,0.43,-0.38],[-1.0,0.43,0.38],[1.0,0.43,0.38] ] as [number,number,number][]).map((p,i)=>(
        <Cylinder key={i} args={[0.04,0.04,0.86,10]} position={p} castShadow>
          <meshStandardMaterial color="#1a1225" metalness={0.5}/>
        </Cylinder>
      ))}
      {/* Sheets / pillow */}
      <RoundedBox args={[2.1,0.07,0.7]} radius={0.04} position={[0,0.97,0]} castShadow>
        <meshStandardMaterial color="#f3e8ff" roughness={0.9}/>
      </RoundedBox>
      <RoundedBox args={[0.55,0.1,0.5]} radius={0.06} position={[-0.75,0.99,0]} castShadow>
        <meshStandardMaterial color="#ede9fe" roughness={0.9}/>
      </RoundedBox>
      {/* Product bottles */}
      {[-0.4,0,0.4].map((x,i)=>(
        <group key={i} position={[1.4,0.95,x]}>
          <Cylinder args={[0.06,0.08,0.28,14]} castShadow>
            <meshStandardMaterial color={i===0?"#7c3aed":i===1?"#db2777":"#0891b2"} roughness={0.4}/>
          </Cylinder>
          <Cylinder args={[0.03,0.03,0.08,10]} position={[0,0.18,0]}>
            <meshStandardMaterial color={WHITE} roughness={0.5}/>
          </Cylinder>
        </group>
      ))}
      {/* Candles */}
      {([ [-1.8,0.95,0.5],[-1.8,0.95,-0.5],[1.8,0.95,0.4] ] as [number,number,number][]).map((p,i)=>(
        <group key={i} position={p}>
          <Cylinder args={[0.055,0.055,0.18,14]} castShadow>
            <meshStandardMaterial color="#f3e8ff" roughness={0.8}/>
          </Cylinder>
          <Sphere args={[0.02,6,5]} position={[0,0.11,0]}>
            <meshStandardMaterial color="#fbbf24" emissive="#f97316" emissiveIntensity={0.8}/>
          </Sphere>
          <pointLight ref={el=>{if(el)candleRefs.current[i]=el;}} position={[0,0.15,0]} intensity={0.35} distance={2.5} color="#ff8c42"/>
        </group>
      ))}
      {/* Diffuser with mist */}
      <group position={[-1.8,0.95,0.0]}>
        <Cylinder args={[0.1,0.14,0.2,16]} castShadow>
          <meshStandardMaterial color="#7c3aed" roughness={0.5}/>
        </Cylinder>
        <Sphere args={[0.05,8,6]} position={[0,0.18,0]}>
          <meshStandardMaterial color={WHITE} transparent opacity={0.6}/>
        </Sphere>
      </group>
      {/* Ambient crystal light */}
      <Sphere args={[0.15,16,12]} position={[0,2.5,0]}>
        <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={0.5}/>
      </Sphere>
      <pointLight position={[0,2.5,0]} intensity={0.5} color="#c4b5fd" distance={5}/>
      <Label text={label} position={[0,3.0,-3.2]} color="#c4b5fd" size={0.26}/>
    </group>
  );
}

/* ─────────────────────────────────────────────────
   OBSERVATORY — telescope dome, star charts, control console
   ─────────────────────────────────────────────── */
function Observatory({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "DOME 1");
  const telescopeRef = useRef<THREE.Group>(null!);
  const starPulseRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (telescopeRef.current) telescopeRef.current.rotation.y = Math.sin(t * 0.08) * 0.4;
    starPulseRefs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.4 + Math.sin(t * (1.2 + i * 0.4) + i * 1.7) * 0.35;
    });
  });
  return (
    <group>
      <fog attach="fog" args={["#01020a", 12, 28]} />
      <Stars radius={80} depth={50} count={2000} factor={5} fade saturation={0.6} />
      <Floor color="#07080f" size={22} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#6366f1" distance={8} />
      <pointLight position={[-3, 1, -1]} intensity={0.2} color="#22d3ee" distance={5} />
      {/* Dome ring */}
      <Torus args={[4.5, 0.18, 12, 60]} position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
      </Torus>
      {/* Dome pillars */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = (deg * Math.PI) / 180;
        return (
          <Cylinder key={deg} args={[0.06, 0.06, 2.5, 8]} position={[Math.sin(r) * 4.5, 1.25, Math.cos(r) * 4.5]}>
            <meshStandardMaterial color="#1e293b" metalness={0.5} />
          </Cylinder>
        );
      })}
      {/* Telescope mount + tube */}
      <group ref={telescopeRef} position={[0, 0, 0]}>
        <Cylinder args={[0.22, 0.3, 1.2, 16]} position={[0, 0.6, 0]} castShadow>
          <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} />
        </Cylinder>
        <Cylinder args={[0.08, 0.08, 0.6, 12]} position={[0, 1.3, 0]}>
          <meshStandardMaterial color={STEEL} metalness={0.8} />
        </Cylinder>
        <group position={[0, 1.6, 0]} rotation={[0.5, 0, 0]}>
          <Cylinder args={[0.18, 0.18, 2.4, 20]} position={[0, 1.2, 0]}>
            <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.3} />
          </Cylinder>
          <Sphere args={[0.2, 16, 12]} position={[0, 2.42, 0]}>
            <meshStandardMaterial color={STEEL_LIGHT} metalness={0.8} />
          </Sphere>
          <Cylinder args={[0.1, 0.15, 0.3, 14]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#111827" metalness={0.7} />
          </Cylinder>
        </group>
      </group>
      {/* Star chart panel */}
      <group position={[-2.5, 1.6, -0.8]} rotation={[0, 0.5, 0]}>
        <RoundedBox args={[1.8, 1.2, 0.07]} radius={0.05} castShadow>
          <meshStandardMaterial color="#0f172a" />
        </RoundedBox>
        <Box args={[1.68, 1.08, 0.01]} position={[0, 0, 0.04]}>
          <meshStandardMaterial color="#030712" emissive="#1e3a5f" emissiveIntensity={0.3} />
        </Box>
        {[[-0.4, 0.2], [0.1, -0.1], [-0.2, -0.3], [0.5, 0.1], [-0.6, -0.1], [0.3, 0.35], [-0.1, 0.4]].map(([x, y], i) => (
          <Sphere key={i} args={[0.028, 6, 5]} position={[x, y, 0.05]}>
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => { if (el) starPulseRefs.current[i] = el; }}
              color={WHITE} emissive={WHITE} emissiveIntensity={0.6} />
          </Sphere>
        ))}
        <Label text="STAR CHART" position={[0, 0.7, 0.05]} color={GOLD} size={0.11} />
      </group>
      {/* Control console */}
      <RoundedBox args={[2.8, 0.12, 0.9]} radius={0.04} position={[2.0, 0.9, 0.5]} rotation={[0, -0.3, 0]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} />
      </RoundedBox>
      <Box args={[2.0, 0.9, 0.06]} position={[2.0, 1.55, 0.1]} rotation={[0, -0.3, -0.15]} castShadow>
        <meshStandardMaterial color="#111827" />
      </Box>
      <Box args={[1.88, 0.78, 0.01]} position={[2.0, 1.55, 0.14]} rotation={[0, -0.3, -0.15]}>
        <meshStandardMaterial color="#030712" emissive="#1e3a5f" emissiveIntensity={0.4} />
      </Box>
      <Label text={label} position={[0, 3.5, 0]} color={GOLD} size={0.28} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   OCEAN RESEARCH — submersible, sonar, porthole, deep blue
   ─────────────────────────────────────────────── */
function OceanResearch({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "STATION DEEP");
  const sonarRef = useRef<THREE.Mesh>(null!);
  const bubbleRefs = useRef<THREE.Mesh[]>([]);
  const fishRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sonarRef.current) sonarRef.current.rotation.z -= 0.015;
    bubbleRefs.current.forEach((b, i) => {
      if (!b) return;
      b.position.y = ((t * 0.3 + i * 0.7) % 2.5) - 0.5;
      b.position.x = Math.sin(t * 0.5 + i * 1.2) * 0.15 + (i % 2 === 0 ? -1.8 : 1.6);
      (b.material as THREE.MeshStandardMaterial).opacity = 0.25 + Math.sin(t + i) * 0.12;
    });
    if (fishRef.current) {
      fishRef.current.position.x = Math.sin(t * 0.25) * 2.5;
      fishRef.current.rotation.y = Math.cos(t * 0.25) > 0 ? 0 : Math.PI;
    }
  });
  return (
    <group>
      <fog attach="fog" args={["#011122", 8, 22]} />
      <Floor color="#010c18" size={24} />
      <pointLight position={[0, 2, 0]} intensity={0.45} color="#0ea5e9" distance={9} />
      <pointLight position={[-3, 0.5, 0]} intensity={0.2} color="#22d3ee" distance={6} />
      <pointLight position={[3, 0.5, 0]} intensity={0.15} color="#0891b2" distance={5} />
      <mesh position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#012040" transparent opacity={0.6} />
      </mesh>
      {/* Submersible hull */}
      <Sphere args={[1.6, 24, 16]} position={[0, 1.2, 0]} scale={[1, 0.65, 0.65]} castShadow>
        <meshStandardMaterial color="#0f2744" metalness={0.5} roughness={0.4} />
      </Sphere>
      {([-0.6, 0.0, 0.6] as number[]).map((x, i) => (
        <group key={i} position={[x, 1.35, 1.05]}>
          <Cylinder args={[0.27, 0.27, 0.06, 24]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={STEEL} metalness={0.9} />
          </Cylinder>
          <Sphere args={[0.22, 16, 12]} position={[0, 0, 0.02]}>
            <meshStandardMaterial color="#0ea5e9" transparent opacity={0.55} emissive="#0284c7" emissiveIntensity={0.25} />
          </Sphere>
        </group>
      ))}
      {/* Sonar display */}
      <group position={[-2.2, 1.7, -0.3]} rotation={[0, 0.55, 0]}>
        <RoundedBox args={[1.4, 1.4, 0.08]} radius={0.06} castShadow>
          <meshStandardMaterial color="#111827" />
        </RoundedBox>
        <Sphere args={[0.55, 24, 16]} position={[0, 0, 0.06]} scale={[1, 1, 0.04]}>
          <meshStandardMaterial color="#001a00" emissive={GREEN} emissiveIntensity={0.15} />
        </Sphere>
        <mesh ref={sonarRef} position={[0, 0, 0.07]}>
          <coneGeometry args={[0.54, 0.54, 3, 1, true, 0, 0.4]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.5} transparent opacity={0.35} />
        </mesh>
        {[[0.2, 0.15], [-0.25, -0.1], [0.1, -0.35]].map(([bx, by], i) => (
          <Sphere key={i} args={[0.035, 8, 6]} position={[bx, by, 0.08]}>
            <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.9} />
          </Sphere>
        ))}
        <Label text="SONAR" position={[0, 0.82, 0.08]} color={GREEN} size={0.1} />
      </group>
      {/* Bubbles */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Sphere key={i} ref={(el: THREE.Mesh | null) => { if (el) bubbleRefs.current[i] = el; }}
          args={[0.04 + (i % 3) * 0.02, 8, 6]} position={[i % 2 === 0 ? -1.8 : 1.6, i * 0.4 - 0.5, 0]}>
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} />
        </Sphere>
      ))}
      {/* Fish silhouette */}
      <group ref={fishRef} position={[0, 2.8, -1.5]}>
        <Sphere args={[0.2, 12, 8]} scale={[1.6, 0.7, 0.5]}>
          <meshStandardMaterial color="#1d4ed8" transparent opacity={0.6} />
        </Sphere>
        <Cone args={[0.18, 0.35, 3]} position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#1d4ed8" transparent opacity={0.5} />
        </Cone>
      </group>
      <Label text={label} position={[0, 3.5, 0]} color="#22d3ee" size={0.28} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   BIO LAB — microscope, specimens, petri dishes
   ─────────────────────────────────────────────── */
function BioLab({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "BENCH 4");
  const cellRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cellRefs.current.forEach((c, i) => {
      if (!c) return;
      c.rotation.z = t * 0.15 * (i % 2 === 0 ? 1 : -1);
      c.scale.setScalar(0.95 + Math.sin(t * 0.8 + i * 1.1) * 0.05);
    });
  });
  const specimenData: [number, string][] = [[2.0, "#16a34a"], [2.4, "#b45309"]];
  return (
    <group>
      <Floor color="#0a1012" size={18} />
      <RoundedBox args={[5.0, 0.1, 1.4]} radius={0.04} position={[0, 0.92, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d1fae5" roughness={0.6} />
      </RoundedBox>
      {([ [-2.3, 0.46, -0.65], [2.3, 0.46, -0.65], [-2.3, 0.46, 0.65], [2.3, 0.46, 0.65] ] as [number, number, number][]).map((p, i) => (
        <Cylinder key={i} args={[0.04, 0.04, 0.92, 8]} position={p}>
          <meshStandardMaterial color={STEEL} metalness={0.7} />
        </Cylinder>
      ))}
      <Cylinder args={[0.28, 0.18, 0.1, 24]} position={[0, 2.8, 0]}>
        <meshStandardMaterial color={STEEL_LIGHT} metalness={0.6} />
      </Cylinder>
      <pointLight position={[0, 2.65, 0]} intensity={0.7} color="#fff8f0" distance={5} />
      {/* Microscope */}
      <group position={[-1.2, 0.97, 0.1]}>
        <Cylinder args={[0.12, 0.18, 0.18, 16]} castShadow>
          <meshStandardMaterial color="#1f2937" metalness={0.6} />
        </Cylinder>
        <Cylinder args={[0.06, 0.06, 0.9, 12]} position={[0, 0.54, 0]} castShadow>
          <meshStandardMaterial color="#111827" metalness={0.5} />
        </Cylinder>
        <Sphere args={[0.08, 12, 8]} position={[0.08, 0.95, 0]} castShadow>
          <meshStandardMaterial color="#374151" metalness={0.6} />
        </Sphere>
        <Cylinder args={[0.055, 0.055, 0.35, 10]} position={[0.08, 0.78, 0]} rotation={[0.3, 0, 0]}>
          <meshStandardMaterial color="#111827" metalness={0.7} />
        </Cylinder>
        <Sphere args={[0.065, 10, 8]} position={[0, 0.04, 0.1]}>
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.7} emissive="#38bdf8" emissiveIntensity={0.3} />
        </Sphere>
      </group>
      {/* Petri dishes */}
      {[0.3, 0.9, 1.5].map((x, i) => (
        <group key={i} position={[x, 0.97, -0.25]}>
          <Cylinder args={[0.22, 0.22, 0.04, 24]}>
            <meshStandardMaterial color="#d1fae5" transparent opacity={0.6} roughness={0.4} />
          </Cylinder>
          {[[0, 0], [-0.08, 0.1], [0.1, -0.05]].map(([cx, cz], j) => (
            <Sphere key={j} ref={(el: THREE.Mesh | null) => { if (el) cellRefs.current[i * 3 + j] = el; }}
              args={[0.045, 8, 6]} position={[cx, 0.035, cz]} scale={[1, 0.3, 1]}>
              <meshStandardMaterial color={i === 0 ? "#22c55e" : i === 1 ? "#f97316" : "#a855f7"} transparent opacity={0.7} />
            </Sphere>
          ))}
        </group>
      ))}
      {/* Specimen jars */}
      {specimenData.map(([x, col], i) => (
        <group key={i} position={[x, 0.97, 0.3]}>
          <Cylinder args={[0.1, 0.1, 0.3, 14]}>
            <meshStandardMaterial color={col} transparent opacity={0.55} roughness={0.3} />
          </Cylinder>
          <Cylinder args={[0.1, 0.1, 0.04, 14]} position={[0, 0.17, 0]}>
            <meshStandardMaterial color="#374151" />
          </Cylinder>
          <Sphere args={[0.055, 8, 6]} position={[0, 0.0, 0]} scale={[0.8, 1.3, 0.8]}>
            <meshStandardMaterial color={i === 0 ? "#86efac" : "#d97706"} transparent opacity={0.7} />
          </Sphere>
        </group>
      ))}
      {/* Results notebook */}
      <Box args={[0.4, 0.03, 0.52]} position={[-2.0, 0.97, 0.2]} castShadow>
        <meshStandardMaterial color="#fef9c3" roughness={0.9} />
      </Box>
      <mesh position={[0, 2.0, -3.2]} receiveShadow>
        <planeGeometry args={[7, 4]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.95} />
      </mesh>
      <Label text={label} position={[0, 3.3, -3.0]} color={GREEN} size={0.26} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   BRAIN LAB — MRI scans, neural displays, scanning rig
   ─────────────────────────────────────────────── */
function BrainLab({ params }: { params: Params }) {
  const label = strParam(params, "stationLabel", "SCAN LAB 2");
  const neuronRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const scanLineRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    neuronRefs.current.forEach((n, i) => {
      if (!n) return;
      n.emissiveIntensity = 0.2 + Math.sin(t * (1.5 + i * 0.3) + i * 2.1) * 0.5;
    });
    if (scanLineRef.current) {
      scanLineRef.current.position.y = 1.3 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.8;
      (scanLineRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.4 + Math.sin(t * 0.5) * 0.2;
    }
  });
  return (
    <group>
      <Floor color="#090c14" size={20} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#a78bfa" distance={8} />
      <pointLight position={[-3, 1.5, 0]} intensity={0.2} color="#38bdf8" distance={5} />
      {/* MRI scanner ring */}
      <group position={[0, 1.3, -0.5]}>
        <Torus args={[1.1, 0.3, 18, 48]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
        </Torus>
        <Cylinder args={[0.82, 0.82, 0.02, 36]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} transparent opacity={0.4} />
        </Cylinder>
        <pointLight position={[0, 0, 0]} intensity={0.4} color="#0ea5e9" distance={3} />
        <mesh ref={scanLineRef} position={[0, 0, 0]}>
          <planeGeometry args={[1.6, 0.04]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} transparent opacity={0.5} />
        </mesh>
        <RoundedBox args={[0.5, 0.12, 2.0]} radius={0.04} position={[0, -0.9, 0.5]} castShadow>
          <meshStandardMaterial color={STEEL_LIGHT} metalness={0.5} roughness={0.5} />
        </RoundedBox>
      </group>
      {/* Main brain scan display */}
      <group position={[-2.5, 1.7, -0.5]} rotation={[0, 0.6, 0]}>
        <RoundedBox args={[2.0, 1.4, 0.08]} radius={0.06} castShadow>
          <meshStandardMaterial color="#111827" />
        </RoundedBox>
        <Box args={[1.88, 1.28, 0.01]} position={[0, 0, 0.05]}>
          <meshStandardMaterial color="#0a0014" emissive="#2e1065" emissiveIntensity={0.3} />
        </Box>
        {[0.55, 0.38, 0.22, 0.1].map((r, i) => (
          <Torus key={i} args={[r, 0.025, 10, 36]} position={[-0.1, 0.1, 0.06]}>
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => { if (el) neuronRefs.current[i] = el; }}
              color={i === 0 ? "#7c3aed" : i === 1 ? "#a855f7" : i === 2 ? "#c4b5fd" : "#e9d5ff"}
              emissive={i === 0 ? "#7c3aed" : i === 1 ? "#a855f7" : "#c4b5fd"}
              emissiveIntensity={0.4}
            />
          </Torus>
        ))}
        {[[0.22, 0.2], [-0.18, 0.05], [0.05, -0.22]].map(([bx, by], i) => (
          <Sphere key={i} args={[0.065, 10, 8]} position={[bx, by, 0.07]}>
            <meshStandardMaterial
              ref={(el: THREE.MeshStandardMaterial | null) => { if (el) neuronRefs.current[4 + i] = el; }}
              color={WARN_RED} emissive={WARN_RED} emissiveIntensity={0.6} transparent opacity={0.8} />
          </Sphere>
        ))}
        <Label text="FMRI SCAN" position={[0, 0.78, 0.06]} color="#c4b5fd" size={0.1} />
      </group>
      {/* Data console */}
      <RoundedBox args={[2.6, 0.1, 0.9]} radius={0.04} position={[2.2, 0.88, 0.5]} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} />
      </RoundedBox>
      <Box args={[1.8, 0.8, 0.06]} position={[2.2, 1.5, 0.1]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Box>
      <Box args={[1.68, 0.68, 0.01]} position={[2.2, 1.5, 0.14]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial color="#0a0014" emissive="#4c1d95" emissiveIntensity={0.3} />
      </Box>
      {[-0.25, 0, 0.25].map((y, i) => (
        <mesh key={i} position={[2.2, 1.5 + y * 0.7, 0.15]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[1.4, 0.015, 0.01]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => { if (el) neuronRefs.current[7 + i] = el; }}
            color={i === 0 ? "#a855f7" : i === 1 ? "#38bdf8" : GREEN}
            emissive={i === 0 ? "#a855f7" : i === 1 ? "#38bdf8" : GREEN}
            emissiveIntensity={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -3.5]} receiveShadow>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} />
      </mesh>
      <Label text={label} position={[0, 3.5, -3.2]} color="#c4b5fd" size={0.28} />
    </group>
  );
}

/* ─────────────────────────────────────────────────
   DISPATCHER
   ─────────────────────────────────────────────── */
const SCENE_MAP: Record<string, React.ComponentType<{ params: Params }>> = {
  "mech-lab": MechLab,
  "construction-site": ConstructionSite,
  "circuit-board": CircuitBoard,
  "chem-plant": ChemPlant,
  "factory-floor": FactoryFloor,
  "office-desk": OfficeDesk,
  "hospital-room": HospitalRoom,
  "server-room": ServerRoom,
  "data-viz": DataViz,
  courtroom: Courtroom,
  kitchen: Kitchen,
  "rooftop-solar": RooftopSolar,
  "wind-turbine": WindTurbine,
  spa: Spa,
  observatory: Observatory,
  "ocean-research": OceanResearch,
  "bio-lab": BioLab,
  "brain-lab": BrainLab,
};

export default function EnvironmentScene({
  environment,
  params = {},
}: {
  environment: string;
  params: Params;
}) {
  const Scene = SCENE_MAP[environment] ?? MechLab;
  return <Scene params={params} />;
}
