"use client";

import { useCallback, useState } from "react";
import { getDeactivatedClass, getPersonTitle } from "@/lib/deactivated-user";

interface AvatarBadgeProps {
  initials: string;
  color: string;
  size?: number;
  overlap?: boolean;
  /** Full name, shown as a tooltip. */
  name?: string;
  /** Profile photo. The initials over `color` are drawn instead while it is missing, loading or fails to load. */
  avatar_url?: string | null;
  /** Renders the badge faded, for a person whose account is deactivated. */
  is_deactivated?: boolean;
  /** Draws the white ring that separates stacked avatars. Off for avatars sitting alone (picker rows, chips). */
  has_ring?: boolean;
}

/** Placeholder strings a serialized empty value can arrive as, never worth a network request. */
const EMPTY_URL_VALUES = new Set(["", "null", "undefined"]);

/** Trims the photo url and drops empty or placeholder values, so they fall straight back to the initials. */
function getUsableAvatarUrl(avatar_url?: string | null): string | null {
  const trimmed_url = avatar_url?.trim() ?? "";
  return EMPTY_URL_VALUES.has(trimmed_url.toLowerCase()) ? null : trimmed_url;
}

/** Circular person avatar used by the table's People cells and picker, monday style. */
export default function AvatarBadge({
  initials,
  color,
  size = 26,
  overlap = true,
  name,
  avatar_url,
  is_deactivated,
  has_ring = true,
}: AvatarBadgeProps) {
  const photo_url = getUsableAvatarUrl(avatar_url);
  // Both keyed by the url, so a person whose photo changes gets a fresh attempt instead of staying on initials.
  const [failed_url, setFailedUrl] = useState<string | null>(null);
  const [loaded_url, setLoadedUrl] = useState<string | null>(null);
  const can_show_photo = Boolean(photo_url) && failed_url !== photo_url;
  const is_photo_loaded = can_show_photo && loaded_url === photo_url;
  const ring_width = has_ring ? 2 : 0;

  // An image served from cache can finish (or fail) before React attaches `onLoad` / `onError`,
  // so the node is checked once it mounts and those early outcomes are never missed.
  const syncPhotoState = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image || !photo_url || !image.complete) return;
      if (image.naturalWidth > 0) setLoadedUrl(photo_url);
      else setFailedUrl(photo_url);
    },
    [photo_url]
  );

  return (
    <div
      title={name ? getPersonTitle(name, is_deactivated) : undefined}
      className={`relative flex flex-none items-center justify-center overflow-hidden rounded-full font-semibold leading-none text-white ${has_ring ? "border-boardtree-surface" : ""} ${getDeactivatedClass(is_deactivated)}`}
      style={{
        width: size,
        height: size,
        background: color,
        borderWidth: ring_width,
        borderStyle: has_ring ? "solid" : "none",
        // Each stacked avatar tucks a quarter of itself under the previous one.
        marginLeft: overlap ? -Math.round(size * 0.27) : undefined,
        fontSize: Math.max(9, Math.round(size * 0.37)),
      }}
    >
      {/* The initials stay underneath until the photo has really loaded, so the badge is never an empty circle. */}
      {!is_photo_loaded && <span className="select-none">{initials}</span>}
      {can_show_photo && (
        // A plain <img>: the photos live on the API's storage (S3 or local), outside `next/image`'s configured hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo_url}
          ref={syncPhotoState}
          src={photo_url as string}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          className={`absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-150 ${is_photo_loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoadedUrl(photo_url)}
          onError={() => setFailedUrl(photo_url)}
        />
      )}
    </div>
  );
}
