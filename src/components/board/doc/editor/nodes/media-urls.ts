/** Only web and in-browser URLs may be rendered, never `javascript:` and friends. */
export const isSafeUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(url, typeof window === "undefined" ? "https://localhost" : window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/** Adds `https://` to a bare domain typed by the writer. */
export const normalizeUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) return value;
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
};

export const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** A player URL for YouTube, Vimeo and Loom links, null for anything else. */
export const toEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const video_id =
        parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
      return video_id ? `https://www.youtube-nocookie.com/embed/${video_id}` : null;
    }
    if (host === "vimeo.com") {
      const video_id = parsed.pathname.match(/^\/(\d+)/)?.[1];
      return video_id ? `https://player.vimeo.com/video/${video_id}` : null;
    }
    if (host === "player.vimeo.com") return url;
    if (host.endsWith("loom.com")) {
      const video_id = parsed.pathname.match(/^\/(?:share|embed)\/([^/?]+)/)?.[1];
      return video_id ? `https://www.loom.com/embed/${video_id}` : null;
    }
    return null;
  } catch {
    return null;
  }
};

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
