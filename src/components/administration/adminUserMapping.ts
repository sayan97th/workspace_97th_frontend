import type { BoardPersonOption } from "@/components/board";
import type { AdminUserDto } from "@/types/administration/admin-users";

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Maps a real `AdminUserDto` onto the board toolbar's {@link BoardPersonOption} shape, shared by every Administration picker that needs a person's avatar. */
export const toPersonOption = (user: AdminUserDto): BoardPersonOption => ({
  id: String(user.id),
  name: user.full_name,
  initials: getInitials(user.full_name),
  avatar_seed: user.id,
  avatar_url: user.profile_photo_url ?? undefined,
});
