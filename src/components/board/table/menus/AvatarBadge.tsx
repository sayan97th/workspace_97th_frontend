interface AvatarBadgeProps {
  initials: string;
  color: string;
  size?: number;
  overlap?: boolean;
}

export default function AvatarBadge({ initials, color, size = 26, overlap = true }: AvatarBadgeProps) {
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full border-2 border-boardtree-surface text-[9.5px] font-semibold text-white ${overlap ? "-ml-[7px]" : ""}`}
      style={{ width: size, height: size, background: color }}
    >
      {initials}
    </div>
  );
}
