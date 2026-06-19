import type { FeedCategory } from "./feedArticles";

export type VideoType = "youtube" | "vimeo" | "direct";

export type AdminVideo = {
  id: string;
  title: string;
  url: string;
  videoType: VideoType;
  youtubeId?: string;
  vimeoId?: string;
  category: FeedCategory;
  description: string;
  duration: string;
  addedAt: string;
};

export const ADMIN_VIDEOS_KEY = "1waymirror_admin_videos_v1";

export function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

export function parseVideoUrl(url: string): {
  videoType: VideoType;
  youtubeId?: string;
  vimeoId?: string;
} {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) return { videoType: "youtube", youtubeId };
  const vimeoId = extractVimeoId(url);
  if (vimeoId) return { videoType: "vimeo", vimeoId };
  return { videoType: "direct" };
}

export function getAdminVideos(): AdminVideo[] {
  try {
    const raw = localStorage.getItem(ADMIN_VIDEOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminVideo[];
  } catch {
    return [];
  }
}

export function saveAdminVideos(videos: AdminVideo[]): void {
  try {
    localStorage.setItem(ADMIN_VIDEOS_KEY, JSON.stringify(videos));
  } catch {
    /* noop */
  }
}

export function getVideoThumbnail(video: AdminVideo): string | null {
  if (video.videoType === "youtube" && video.youtubeId) {
    return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  }
  return null;
}

export function getVideoEmbedUrl(video: AdminVideo): string | null {
  if (video.videoType === "youtube" && video.youtubeId) {
    return `https://www.youtube.com/embed/${video.youtubeId}?autoplay=0&rel=0&modestbranding=1`;
  }
  if (video.videoType === "vimeo" && video.vimeoId) {
    return `https://player.vimeo.com/video/${video.vimeoId}?autoplay=0`;
  }
  return null;
}
