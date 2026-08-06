import type { BoardPersonOption } from "@/components/board/toolbar/types";
import type { Team, TeamMember } from "@/components/teams/types";

/**
 * The Teams directory's mock account roster (Client Hub itself is now a
 * real, database-backed board and no longer uses this — see
 * `ClientHubContentSeeder` for its real seeded team).
 */
const ACCOUNT_TEAM_ROSTER: BoardPersonOption[] = [
  { id: "josh", name: "Josh Moody", initials: "JM", avatar_seed: 0 },
  { id: "blake", name: "Blake Denton", initials: "BD", avatar_seed: 1 },
  { id: "brandon", name: "Brandon Stewart", initials: "BS", avatar_seed: 2 },
  { id: "rachel", name: "Rachel Tonkovich", initials: "RT", avatar_seed: 3 },
  { id: "paxton", name: "Paxton Gray", initials: "PG", avatar_seed: 4 },
  { id: "hayley", name: "Hayley Robinson", initials: "HR", avatar_seed: 5 },
  { id: "sam", name: "Sam Rivera", initials: "SR", avatar_seed: 6 },
  { id: "haley", name: "Haley Brooks", initials: "HB", avatar_seed: 7 },
  { id: "jon", name: "Jon Mattingly", initials: "JM", avatar_seed: 8 },
  { id: "danny", name: "Danny Olsen", initials: "DO", avatar_seed: 9 },
  { id: "mike", name: "Mike Powell", initials: "MP", avatar_seed: 10 },
  { id: "jasmin", name: "Jasmin Cole", initials: "JC", avatar_seed: 11, is_guest: true },
  { id: "kate", name: "Kate Sherwood", initials: "KS", avatar_seed: 12 },
  { id: "devin", name: "Devin Marsh", initials: "DM", avatar_seed: 13 },
  { id: "nora", name: "Nora Fields", initials: "NF", avatar_seed: 14 },
  { id: "owen", name: "Owen Hart", initials: "OH", avatar_seed: 15 },
  { id: "priya", name: "Priya Nair", initials: "PN", avatar_seed: 16, is_guest: true },
  { id: "liam", name: "Liam Foster", initials: "LF", avatar_seed: 17 },
  { id: "maya", name: "Maya Ortiz", initials: "MO", avatar_seed: 18 },
];

/** Job title shown in the Teams member table, keyed by the roster's person id. */
const TITLES_BY_MEMBER_ID: Record<string, string> = {
  josh: "VP of Client Services",
  blake: "Head of Accounts",
  brandon: "Account Director",
  rachel: "Head of HR",
  paxton: "Account Manager",
  hayley: "Account Manager",
  sam: "Head of IT",
  haley: "Finance Manager",
  jon: "Guest Consultant",
  danny: "Head of Search",
  mike: "Head of Design",
  jasmin: "Marketing Consultant",
  kate: "Content Strategist",
  devin: "SEO Specialist",
  nora: "Creative Director",
  owen: "PPC Specialist",
  priya: "Partner Consultant",
  liam: "Web Developer",
  maya: "Project Manager",
};

/** Id of the account owner in {@link TEAMS_ROSTER}. */
export const TEAMS_OWNER_ID = "josh";

/**
 * Account-wide people directory for the Teams views. Layers the email/title
 * fields the Teams member table needs onto {@link ACCOUNT_TEAM_ROSTER}.
 */
export const TEAMS_ROSTER: TeamMember[] = ACCOUNT_TEAM_ROSTER.map((person) => ({
  ...person,
  email: `${person.id}@97thfloor.com`,
  title: TITLES_BY_MEMBER_ID[person.id],
  is_owner: person.id === TEAMS_OWNER_ID,
}));

export const findTeamsMember = (id: string): TeamMember | undefined =>
  TEAMS_ROSTER.find((member) => member.id === id);

/** Seed teams shown in the Teams view's left rail before the user creates any of their own. */
export const TEAMS_SEED: Team[] = [
  {
    id: "account-directors",
    name: "Account Directors",
    member_ids: ["josh", "blake", "brandon", "rachel", "paxton", "hayley"],
  },
  {
    id: "department-heads",
    name: "Department Heads",
    member_ids: ["blake", "danny", "mike", "nora"],
  },
  {
    id: "team-josh",
    name: "Team Josh",
    member_ids: ["josh", "hayley", "paxton", "jasmin"],
  },
];
