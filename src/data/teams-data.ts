import type { Team, TeamMember } from "@/components/teams/types";
import { CLIENT_HUB_TEAM_ROSTER } from "./client-hub-data";

/** Job title shown in the Teams member table, keyed by the shared board roster's person id. */
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
 * Account-wide people directory for the Teams views. Reuses the app's canonical
 * {@link CLIENT_HUB_TEAM_ROSTER} (same ids/names/avatars everywhere a person appears)
 * and layers on the email/title fields the Teams member table needs.
 */
export const TEAMS_ROSTER: TeamMember[] = CLIENT_HUB_TEAM_ROSTER.map((person) => ({
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
