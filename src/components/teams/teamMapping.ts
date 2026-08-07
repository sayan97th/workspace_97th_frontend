import type { AccountTeamMemberDto } from "@/types/account-teams";
import type { TeamMember } from "./types";

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Maps a real `AccountTeamMemberDto` onto the Teams views' {@link TeamMember} shape. */
export const mapAccountTeamMemberDtoToTeamMember = (dto: AccountTeamMemberDto): TeamMember => ({
  id: dto.id,
  name: dto.full_name,
  initials: getInitials(dto.full_name),
  avatar_seed: Number(dto.id),
  avatar_url: dto.profile_photo_url ?? undefined,
  email: dto.email,
  title: dto.job_title ?? undefined,
  is_owner: dto.is_owner,
});
