import type { FeedCategory } from "./feedArticles";

export interface VideoItem {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
  description: string;
  addedDate: string;
}

export interface VideoPlaylist {
  id: string;
  category: FeedCategory;
  title: string;
  description: string;
  addedDate: string;
  videos: VideoItem[];
}

/* Videos are managed by admin via the Admin Panel.
   Empty by default — add videos via /admin → Videos tab. */
export const VIDEO_PLAYLISTS: VideoPlaylist[] = [];

export function getPlaylistsByCategory(category: FeedCategory): VideoPlaylist[] {
  return VIDEO_PLAYLISTS.filter(p => p.category === category);
}

export function getPlaylistById(id: string): VideoPlaylist | undefined {
  return VIDEO_PLAYLISTS.find(p => p.id === id);
}

export const PLAYLIST_CATEGORY_COLORS: Record<FeedCategory, string> = {
  engineering:       "#f5a524",
  business:          "#f97316",
  healthcare:        "#ec4899",
  technology:        "#3b82f6",
  trades:            "#eab308",
  law:               "#a855f7",
  science:           "#22d3ee",
  "life-advice":     "#4ade80",
  "creative-design": "#e879f9",
};
