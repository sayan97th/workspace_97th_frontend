interface AvatarProps {
  initials: string;
  background_color: string;
  size_px?: number;
  overlap?: boolean;
  className?: string;
}

const Avatar = ({ initials, background_color, size_px = 27, overlap = true, className = "" }: AvatarProps) => (
  <div
    className={`flex flex-none items-center justify-center rounded-full border-2 border-white font-semibold text-white ${overlap ? "-ml-[7px]" : ""} ${className}`}
    style={{
      width: size_px,
      height: size_px,
      background: background_color,
      fontSize: size_px * 0.35,
      letterSpacing: "0.02em",
    }}
  >
    {initials}
  </div>
);

export default Avatar;
