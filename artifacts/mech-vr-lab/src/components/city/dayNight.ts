/** Module-level day/night state — mutated by SceneLighting's useFrame, read by any component */
export const DNState = {
  /** 0 = midnight · 0.25 = sunrise · 0.5 = noon · 0.75 = sunset */
  time: 0.28,
};

/** 20-minute real-time full cycle */
export const CYCLE_SECONDS = 1200;

/**
 * Returns 0 (full night) → 1 (full day) smooth factor.
 * Sunrise 0.20–0.28, Day 0.28–0.75, Sunset 0.75–0.88, Night otherwise.
 */
export function getDayFactor(): number {
  const t = DNState.time;
  if (t < 0.20 || t > 0.88) return 0;
  if (t < 0.28) return (t - 0.20) / 0.08;
  if (t < 0.75) return 1;
  return (0.88 - t) / 0.13;
}

/** World-space directional light position of the sun at the current time. */
export function getSunPos(): [number, number, number] {
  const angle = (DNState.time - 0.25) * Math.PI * 2;
  return [
    Math.cos(angle) * 130,
    Math.max(Math.sin(angle) * 160, -40),
    50 + Math.sin(angle) * 30,
  ];
}
