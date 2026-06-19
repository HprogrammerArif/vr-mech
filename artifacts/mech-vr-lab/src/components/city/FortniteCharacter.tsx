/**
 * FortniteCharacter — stylized cartoon-human character inspired by Fortnite's
 * big-head, wide-shoulder, tapered-leg proportions. Uses only Three.js primitives.
 * Enhanced version: larger head, backpack, wristbands, badge, better shoes.
 */
import * as THREE from "three";

export type CharacterColors = {
  skinTone: string;
  hairColor: string;
  outfitColor: string;
  accentColor: string;
};

export function buildFortniteCharacter(
  colors: CharacterColors,
  scene: THREE.Group,
) {
  const { skinTone, hairColor, outfitColor, accentColor } = colors;

  const mat = (color: string, emissive?: string, emissiveIntensity = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: emissive ?? color,
      emissiveIntensity,
      roughness: 0.55,
      metalness: 0.15,
    });

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  };

  /* ── SHOES ── */
  add(new THREE.BoxGeometry(0.25, 0.12, 0.36), mat("#0d1117"), undefined, 0, -0.17, 0.08);
  add(new THREE.BoxGeometry(0.25, 0.12, 0.36), mat("#0d1117"), undefined, 0, 0.17, 0.08);
  /* Shoe sole stripe */
  add(new THREE.BoxGeometry(0.26, 0.04, 0.37), mat(accentColor, accentColor, 0.2), -0.17, -0.01, 0.08);
  add(new THREE.BoxGeometry(0.26, 0.04, 0.37), mat(accentColor, accentColor, 0.2),  0.17, -0.01, 0.08);

  /* ── LOWER LEGS ── */
  add(new THREE.CylinderGeometry(0.115, 0.095, 0.72, 12), mat(accentColor), undefined, 0, -0.17, 0.47);
  add(new THREE.CylinderGeometry(0.115, 0.095, 0.72, 12), mat(accentColor), undefined, 0,  0.17, 0.47);

  /* ── KNEE PADS ── */
  add(new THREE.SphereGeometry(0.10, 8, 7), mat(accentColor, accentColor, 0.2), -0.17, 0.78, 0.10);
  add(new THREE.SphereGeometry(0.10, 8, 7), mat(accentColor, accentColor, 0.2),  0.17, 0.78, 0.10);

  /* ── UPPER LEGS ── */
  add(new THREE.CylinderGeometry(0.145, 0.115, 0.64, 12), mat(outfitColor, outfitColor, 0.05), undefined, 0, -0.17, 1.14);
  add(new THREE.CylinderGeometry(0.145, 0.115, 0.64, 12), mat(outfitColor, outfitColor, 0.05), undefined, 0,  0.17, 1.14);

  /* ── BELT ── */
  add(new THREE.CylinderGeometry(0.245, 0.245, 0.09, 18), mat("#111827"), undefined, 0, 0, 1.50);
  /* Belt buckle */
  add(new THREE.BoxGeometry(0.14, 0.09, 0.06), mat(accentColor, accentColor, 0.5), 0, 1.50, 0.245);

  /* ── TORSO ── */
  const torsoGeo = new THREE.CylinderGeometry(0.305, 0.245, 0.78, 10);
  add(torsoGeo, mat(outfitColor, outfitColor, 0.06), undefined, 0, 0, 2.04);

  /* ── CHEST BADGE / EMBLEM ── */
  add(new THREE.BoxGeometry(0.30, 0.135, 0.065), mat(accentColor, accentColor, 0.4), 0, 2.12, 0.225);
  /* "1W" text suggestion via small bright box */
  add(new THREE.BoxGeometry(0.10, 0.07, 0.07), mat("#ffffff", "#ffffff", 0.8), 0, 2.12, 0.255);

  /* ── SHOULDER PADS ── */
  add(new THREE.SphereGeometry(0.175, 12, 10), mat(accentColor, accentColor, 0.2), -0.40, 2.28, 0);
  add(new THREE.SphereGeometry(0.175, 12, 10), mat(accentColor, accentColor, 0.2),  0.40, 2.28, 0);

  /* ── UPPER ARMS ── */
  add(new THREE.CylinderGeometry(0.108, 0.090, 0.58, 12), mat(outfitColor, outfitColor, 0.04), undefined, -0.42, 1.92, 0, 0, 0, 0.2);
  add(new THREE.CylinderGeometry(0.108, 0.090, 0.58, 12), mat(outfitColor, outfitColor, 0.04), undefined,  0.42, 1.92, 0, 0, 0, -0.2);

  /* ── FOREARMS ── */
  add(new THREE.CylinderGeometry(0.082, 0.068, 0.46, 12), mat(skinTone), undefined, -0.46, 1.50, 0);
  add(new THREE.CylinderGeometry(0.082, 0.068, 0.46, 12), mat(skinTone), undefined,  0.46, 1.50, 0);

  /* ── WRISTBANDS ── */
  add(new THREE.CylinderGeometry(0.090, 0.090, 0.08, 12), mat(accentColor, accentColor, 0.3), -0.46, 1.30, 0);
  add(new THREE.CylinderGeometry(0.090, 0.090, 0.08, 12), mat(accentColor, accentColor, 0.3),  0.46, 1.30, 0);

  /* ── HANDS ── */
  add(new THREE.SphereGeometry(0.092, 10, 8), mat(skinTone), -0.46, 1.22, 0);
  add(new THREE.SphereGeometry(0.092, 10, 8), mat(skinTone),  0.46, 1.22, 0);

  /* ── NECK ── */
  add(new THREE.CylinderGeometry(0.125, 0.140, 0.24, 14), mat(skinTone), 0, 2.50, 0);

  /* ── HEAD ── */
  add(new THREE.SphereGeometry(0.40, 20, 16), mat(skinTone), 0, 3.06, 0);

  /* ── EYE WHITES ── */
  add(new THREE.SphereGeometry(0.088, 10, 8), mat("#ffffff"), -0.125, 3.10, 0.34);
  add(new THREE.SphereGeometry(0.088, 10, 8), mat("#ffffff"),  0.125, 3.10, 0.34);

  /* ── IRISES ── */
  add(new THREE.SphereGeometry(0.052, 10, 8), mat("#1a3a8f"), -0.125, 3.10, 0.374);
  add(new THREE.SphereGeometry(0.052, 10, 8), mat("#1a3a8f"),  0.125, 3.10, 0.374);

  /* ── PUPILS ── */
  add(new THREE.SphereGeometry(0.028, 8, 7), mat("#000000"), -0.125, 3.10, 0.390);
  add(new THREE.SphereGeometry(0.028, 8, 7), mat("#000000"),  0.125, 3.10, 0.390);

  /* ── EYE SHINE ── */
  add(new THREE.SphereGeometry(0.014, 6, 5), mat("#ffffff", "#ffffff", 1.5), -0.108, 3.120, 0.397);
  add(new THREE.SphereGeometry(0.014, 6, 5), mat("#ffffff", "#ffffff", 1.5),  0.142, 3.120, 0.397);

  /* ── EYEBROWS ── */
  add(new THREE.BoxGeometry(0.118, 0.032, 0.032), mat(hairColor), -0.125, 3.20, 0.348, -0.18, 0, 0.10);
  add(new THREE.BoxGeometry(0.118, 0.032, 0.032), mat(hairColor),  0.125, 3.20, 0.348, -0.18, 0, -0.10);

  /* ── NOSE ── */
  add(new THREE.ConeGeometry(0.036, 0.080, 7), mat(skinTone), 0, 3.04, 0.39, -Math.PI / 2, 0, 0);

  /* ── SMILE ── */
  add(new THREE.TorusGeometry(0.080, 0.020, 8, 12, Math.PI), mat("#b02020"), 0, 2.93, 0.36, Math.PI, 0, 0);

  /* ── EARS ── */
  add(new THREE.SphereGeometry(0.075, 10, 8), mat(skinTone), -0.40, 3.06, 0);
  add(new THREE.SphereGeometry(0.075, 10, 8), mat(skinTone),  0.40, 3.06, 0);

  /* ── HAIR (dome + bangs + sides) ── */
  add(new THREE.SphereGeometry(0.425, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(hairColor), 0, 3.18, 0);
  add(new THREE.BoxGeometry(0.44, 0.115, 0.20), mat(hairColor), 0, 3.44, 0.25);
  add(new THREE.BoxGeometry(0.092, 0.36, 0.28), mat(hairColor), -0.44, 3.08, 0);
  add(new THREE.BoxGeometry(0.092, 0.36, 0.28), mat(hairColor),  0.44, 3.08, 0);
  /* Back hair */
  add(new THREE.BoxGeometry(0.38, 0.28, 0.10), mat(hairColor), 0, 3.08, -0.40);

  /* ── BACKPACK ── */
  const bpMat = mat(accentColor, accentColor, 0.08);
  add(new THREE.BoxGeometry(0.38, 0.52, 0.22), bpMat, 0, 2.08, -0.42);
  /* Backpack straps */
  add(new THREE.BoxGeometry(0.06, 0.60, 0.04), mat(hairColor), -0.14, 1.92, -0.27);
  add(new THREE.BoxGeometry(0.06, 0.60, 0.04), mat(hairColor),  0.14, 1.92, -0.27);
  /* Backpack pocket */
  add(new THREE.BoxGeometry(0.24, 0.18, 0.06), mat(outfitColor, outfitColor, 0.12), 0, 1.88, -0.54);
  /* Backpack zipper detail */
  add(new THREE.BoxGeometry(0.20, 0.025, 0.065), mat(accentColor, accentColor, 0.6), 0, 1.98, -0.54);
}

void buildFortniteCharacter;
