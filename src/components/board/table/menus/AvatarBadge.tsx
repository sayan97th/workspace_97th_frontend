import { getDeactivatedClass, getPersonTitle } from "@/lib/deactivated-user";

interface AvatarBadgeProps {
  initials: string;
  color: string;
  size?: number;
  overlap?: boolean;
  /** Full name, shown as a tooltip. */
  name?: string;
  /** Renders the badge faded, for a person whose account is deactivated. */
  is_deactivated?: boolean;
}

export default function AvatarBadge({ initials, color, size = 26, overlap = true, name, is_deactivated }: AvatarBadgeProps) {
  return (
    <div
      title={name ? getPersonTitle(name, is_deactivated) : undefined}
      className={`flex flex-none items-center justify-center rounded-full border-2 border-boardtree-surface text-[9.5px] font-semibold text-white ${overlap ? "-ml-[7px]" : ""} ${getDeactivatedClass(is_deactivated)}`}
      style={{ width: size, height: size, background: color }}
    >
      {initials}
    </div>
  );
}
