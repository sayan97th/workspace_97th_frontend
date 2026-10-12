"use client";

import { useState } from "react";
import { getDeactivatedClass, getPersonTitle } from "@/lib/deactivated-user";

interface AvatarBadgeProps {
  initials: string;
  color: string;
  size?: number;
  overlap?: boolean;
  /** Full name, shown as a tooltip. */
  name?: string;
  /** Profile photo. The initials over `color` are drawn instead while it is missing or fails to load. */
  avatar_url?: string | null;
  /** Renders the badge faded, for a person whose account is deactivated. */
  is_deactivated?: boolean;
  /** Draws the white ring that separates stacked avatars. Off for avatars sitting alone (picker rows, chips). */
  has_ring?: boolean;
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
  // Keyed by the url, so a person whose photo changes gets a fresh attempt instead of staying on initials.
  const [failed_url, setFailedUrl] = useState<string | null>(null);
  const show_photo = Boolean(avatar_url) && failed_url !== avatar_url;
  const ring_width = has_ring ? 2 : 0;

  return (
    <div
      title={name ? getPersonTitle(name, is_deactivated) : undefined}
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full font-semibold leading-none text-white ${has_ring ? "border-boardtree-surface" : ""} ${getDeactivatedClass(is_deactivated)}`}
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
      {show_photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar_url as string}
          alt=""
          className="h-full w-full rounded-full object-cover"
          draggable={false}
          onError={() => setFailedUrl(avatar_url ?? null)}
        />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}
