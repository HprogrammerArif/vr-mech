import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { DISTRICTS, type BuildingDef, type DistrictDef } from "./cityData";

function Building({
  def,
  districtColor,
  onEnter,
}: {
  def: BuildingDef;
  districtColor: string;
  onEnter: (d: BuildingDef) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const mainRef = useRef<THREE.Mesh>(null!);
  const winRef = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    if (mainRef.current) {
      const mat = mainRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        hovered ? 2.5 : 0.6,
        dt * 6,
      );
    }
    if (winRef.current) {
      const mat = winRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(Date.now() * 0.001 + def.pos[0]) * 0.15;
    }
  });

  const [bx, bz] = def.pos;
  const [bw, bh, bd] = def.size;
  const shape = def.shape ?? "box";
  const windowRows = Math.max(1, def.floors - 1);
  const windowCols = Math.max(1, Math.floor(bw / 3));
  const r = Math.min(bw, bd) / 2;

  const matColor = {
    color: def.color,
    emissive: def.emissive,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.5,
  };

  const handlers = {
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onClick: () => onEnter(def),
  };

  return (
    <group position={[bx, 0, bz]}>

      {/* ── Cylinder (round tower) ── */}
      {shape === "cylinder" && (
        <mesh ref={mainRef} position={[0, bh / 2, 0]} castShadow receiveShadow {...handlers}>
          <cylinderGeometry args={[r * 0.78, r, bh, 18]} />
          <meshStandardMaterial {...matColor} />
        </mesh>
      )}

      {/* ── Octagon tower ── */}
      {shape === "octagon" && (
        <mesh ref={mainRef} position={[0, bh / 2, 0]} castShadow receiveShadow {...handlers}>
          <cylinderGeometry args={[r * 0.85, r, bh, 8]} />
          <meshStandardMaterial {...matColor} />
        </mesh>
      )}

      {/* ── Dome (box base + half-sphere cap) ── */}
      {shape === "dome" && (
        <group {...handlers}>
          <mesh ref={mainRef} position={[0, bh * 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, bh * 0.75, bd]} />
            <meshStandardMaterial {...matColor} />
          </mesh>
          <mesh position={[0, bh * 0.76, 0]} castShadow>
            <sphereGeometry args={[Math.min(bw, bd) * 0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial {...matColor} emissiveIntensity={0.9} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* ── Pyramid spire (box base + cone top) ── */}
      {shape === "pyramid" && (
        <group {...handlers}>
          <mesh ref={mainRef} position={[0, bh * 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, bh * 0.6, bd]} />
            <meshStandardMaterial {...matColor} />
          </mesh>
          <mesh position={[0, bh * 0.74, 0]} castShadow>
            <coneGeometry args={[r * 0.72, bh * 0.4, 6]} />
            <meshStandardMaterial {...matColor} emissiveIntensity={1.1} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* ── Stepped skyscraper (3 stacked tiers) ── */}
      {shape === "stepped" && (
        <group {...handlers}>
          <mesh ref={mainRef} position={[0, bh * 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[bw, bh * 0.5, bd]} />
            <meshStandardMaterial {...matColor} />
          </mesh>
          <mesh position={[0, bh * 0.64, 0]} castShadow>
            <boxGeometry args={[bw * 0.7, bh * 0.28, bd * 0.7]} />
            <meshStandardMaterial {...matColor} />
          </mesh>
          <mesh position={[0, bh * 0.88, 0]} castShadow>
            <boxGeometry args={[bw * 0.42, bh * 0.24, bd * 0.42]} />
            <meshStandardMaterial {...matColor} emissiveIntensity={0.9} />
          </mesh>
        </group>
      )}

      {/* ── Default box ── */}
      {shape === "box" && (
        <mesh ref={mainRef} position={[0, bh / 2, 0]} castShadow receiveShadow {...handlers}>
          <boxGeometry args={[bw, bh, bd]} />
          <meshStandardMaterial {...matColor} />
        </mesh>
      )}

      {/* Window grid overlay — box shapes only */}
      {shape === "box" && Array.from({ length: windowRows }).map((_, rowIdx) =>
        Array.from({ length: windowCols }).map((_, colIdx) => (
          <mesh
            key={`w${rowIdx}-${colIdx}`}
            ref={rowIdx === 0 && colIdx === 0 ? winRef : undefined}
            position={[
              -bw / 2 + 1.5 + colIdx * ((bw - 2) / Math.max(1, windowCols - 1)),
              1.5 + rowIdx * (bh / (windowRows + 1)),
              bd / 2 + 0.05,
            ]}
          >
            <planeGeometry args={[1.0, 0.8]} />
            <meshStandardMaterial
              color="#0ea5e9"
              emissive="#0ea5e9"
              emissiveIntensity={0.4 + Math.random() * 0.3}
              transparent
              opacity={0.85}
            />
          </mesh>
        )),
      )}

      {/* Hover label */}
      {hovered && (
        <Billboard position={[0, bh + 1.5, 0]}>
          <mesh>
            <planeGeometry args={[bw + 2, 2]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.9}
            color="white"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            {def.label}
          </Text>
          <Text
            position={[0, -0.7, 0.01]}
            fontSize={0.55}
            color="#f5a524"
            anchorX="center"
            anchorY="middle"
          >
            Click to enter
          </Text>
        </Billboard>
      )}
    </group>
  );
}

function DistrictZone({ district, onEnterBuilding }: {
  district: DistrictDef;
  onEnterBuilding: (b: BuildingDef) => void;
}) {
  const [cx, cz] = district.center;
  const color = new THREE.Color(district.color);

  return (
    <group>
      {/* Ground zone */}
      <mesh position={[cx, -0.05, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[district.radius, 32]} />
        <meshStandardMaterial
          color={color.clone().multiplyScalar(0.3)}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* District sign */}
      <Billboard position={[cx, 12, cz - district.radius + 4]}>
        <mesh>
          <planeGeometry args={[district.label.length * 0.65, 3]} />
          <meshStandardMaterial color="#0a1428" transparent opacity={0.9} />
        </mesh>
        <Text
          position={[0, 0.3, 0.01]}
          fontSize={1.1}
          color={district.signColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {district.label.toUpperCase()}
        </Text>
        <Text
          position={[0, -0.8, 0.01]}
          fontSize={0.65}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {district.category}
        </Text>
      </Billboard>

      {/* Buildings */}
      {district.buildings.map(b => (
        <Building
          key={b.id}
          def={b}
          districtColor={district.color}
          onEnter={onEnterBuilding}
        />
      ))}
    </group>
  );
}

export default function Districts({ onEnterBuilding }: {
  onEnterBuilding: (b: BuildingDef) => void;
}) {
  return (
    <group>
      {DISTRICTS.map(d => (
        <DistrictZone key={d.id} district={d} onEnterBuilding={onEnterBuilding} />
      ))}
    </group>
  );
}
