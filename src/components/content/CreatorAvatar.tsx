import React from "react";

export type CreatorAvatarProps = {
  initials: string;
  gradient_from: string;
  gradient_to: string;
  /** Diameter in pixels. */
  size?: number;
  title?: string;
  className?: string;
};

/**
 * Circular gradient avatar showing a person's initials. Reused across the
 * content table, filter popovers and anywhere a creator is represented.
 */
const CreatorAvatar: React.FC<CreatorAvatarProps> = ({
  initials,
  gradient_from,
  gradient_to,
  size = 28,
  title,
  className = "",
}) => (
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

export default CreatorAvatar;
