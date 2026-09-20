import type { AccountTeamDto, AccountTeamMemberDto, AccountTeamOwnerDto } from "@/types/account-teams";
import type { Team, TeamMember } from "./types";

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
  is_team_owner: dto.is_team_owner,
});

const mapOwnerDtoToTeamMember = (dto: AccountTeamOwnerDto): TeamMember => ({
  id: dto.id,
  name: dto.full_name,
  initials: getInitials(dto.full_name),
  avatar_seed: Number(dto.id),
  avatar_url: dto.profile_photo_url ?? undefined,
  email: dto.email,
  is_team_owner: true,
});

/** Maps a real `AccountTeamDto` onto the Teams views' {@link Team} shape. */
export const mapAccountTeamDtoToTeam = (dto: AccountTeamDto): Team => ({
  id: dto.id,
  name: dto.name,
  member_count: dto.member_count,
  owners: dto.owners.map(mapOwnerDtoToTeamMember),
  can_manage: dto.can_manage,
  can_manage_members: dto.can_manage_members,
});
