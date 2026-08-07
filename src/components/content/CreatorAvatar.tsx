import React from "react";

export type CreatorAvatarProps = {
  initials: string;
  gradient_from: string;
  gradient_to: string;
  /** Real uploaded profile photo, when the person has one — takes precedence over the initials gradient. */
  photo_url?: string | null;
  /** Diameter in pixels. */
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Circular avatar for a person: their uploaded profile photo when they have
 * one, otherwise a gradient with their initials. Reused across the content
 * table, filter popovers and anywhere a creator/collaborator is represented.
 */
const CreatorAvatar: React.FC<CreatorAvatarProps> = ({
  initials,
  gradient_from,
  gradient_to,
  photo_url,
  size = 28,
  title,
  className = "",
}) => {
  if (photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary user-uploaded URLs, not static app assets.
      <img
        src={photo_url}
        alt={title ?? ""}
        title={title}
        className={`flex-none rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      title={title}
      className={`flex flex-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        backgroundImage: `linear-gradient(135deg, ${gradient_from}, ${gradient_to})`,
      }}
    >
      {initials}
    </span>
  );
};

export default CreatorAvatar;
