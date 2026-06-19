/**
 * Shared city collision & layout data.
 * Import from here to keep positions in sync between decorations and player physics.
 */
import { DISTRICTS } from "./cityData";

/** Circular collision obstacles: [worldX, worldZ, radius] */
export const COLLISION_CIRCLES: [number, number, number][] = [
  // Central fountain
  [0, 0, 5.8],
  // Trees — must match TREES in CityDecorations
  [18, -4, 2.3], [22, 8, 2.3], [-18, 4, 2.3],
  [-22, -6, 2.3], [6, -22, 2.3], [-6, 22, 2.3],
  [14, 16, 2.3], [-14, -16, 2.3],
  [-44, -30, 2.3], [-40, -22, 2.3], [-38, -36, 2.3],
  [44, -30, 2.3], [40, -22, 2.3], [38, -36, 2.3],
  [5, -44, 2.3], [12, -40, 2.3], [-9, -40, 2.3],
  [44, 30, 2.3], [40, 22, 2.3], [-44, 30, 2.3],
  [-40, 22, 2.3], [-5, 44, 2.3], [9, 42, 2.3], [-9, 40, 2.3],
  [32, 4, 2.3], [-32, -4, 2.3],
  [4, 32, 2.3], [-4, -32, 2.3],
  [22, -20, 2.3], [-22, -20, 2.3],
  [22, 20, 2.3], [-22, 20, 2.3],
  // Lamp posts — must match LAMPS in CityDecorations
  [12, -12, 0.9], [-12, 12, 0.9], [12, 12, 0.9], [-12, -12, 0.9],
  [25, -8, 0.9], [-25, 8, 0.9], [8, 25, 0.9], [-8, -25, 0.9],
  [35, 4, 0.9], [-35, -4, 0.9], [4, 35, 0.9], [-4, -35, 0.9],
];

/** All district building collision circles, computed from DISTRICTS data */
export const BUILDING_COLLIDERS: [number, number, number][] = DISTRICTS.flatMap(d =>
  d.buildings.map(b => {
    // pos: [x, z] in world space; size: [width, height, depth]
    const halfW = b.size[0] / 2;
    const halfD = b.size[2] / 2;
    const radius = Math.max(halfW, halfD) + 1.6;
    return [b.pos[0], b.pos[1], radius] as [number, number, number];
  }),
);

/** Bench decorations — positioned off main pathways */
export const BENCH_POSITIONS: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  // Outer plaza ring — off the paved lanes
  { pos: [23, 0, 2],   rot: [0, Math.PI * 0.5, 0] },
  { pos: [-23, 0, -2], rot: [0, Math.PI * 0.5, 0] },
  { pos: [2, 0, 23],   rot: [0, 0, 0] },
  { pos: [-2, 0, -23], rot: [0, 0, 0] },
  // Along outer spurs
  { pos: [38, 0, -6],  rot: [0, 0, 0] },
  { pos: [-38, 0, 6],  rot: [0, 0, 0] },
  { pos: [6, 0, 38],   rot: [0, Math.PI * 0.5, 0] },
  { pos: [-6, 0, -38], rot: [0, Math.PI * 0.5, 0] },
];

/** Bench collision circles derived from bench positions */
export const BENCH_COLLIDERS: [number, number, number][] = BENCH_POSITIONS.map(
  b => [b.pos[0], b.pos[2], 1.4],
);

/** Max distance the player can travel from the world center */
export const WORLD_LIMIT = 115;
