const LIKES_KEY = "1waymirror_feed_likes_v1";
const SAVES_KEY = "1waymirror_feed_saves_v1";
export const MAX_SAVES = 50;

export function getLikes(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

export function toggleLike(id: string): Set<string> {
  const likes = getLikes();
  if (likes.has(id)) likes.delete(id); else likes.add(id);
  try { localStorage.setItem(LIKES_KEY, JSON.stringify([...likes])); } catch { /* noop */ }
  return likes;
}

export function getSaves(): string[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function toggleSave(id: string): { saves: string[]; hitLimit: boolean } {
  const saves = getSaves();
  const idx = saves.indexOf(id);
  if (idx !== -1) {
    saves.splice(idx, 1);
    try { localStorage.setItem(SAVES_KEY, JSON.stringify(saves)); } catch { /* noop */ }
    return { saves, hitLimit: false };
  }
  if (saves.length >= MAX_SAVES) return { saves, hitLimit: true };
  saves.unshift(id);
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(saves)); } catch { /* noop */ }
  return { saves, hitLimit: false };
}
