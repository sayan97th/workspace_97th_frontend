import type { TrashEntry } from "@/components/trash/types";

/**
 * Seed rows for the account Trash dialog (Account menu > Trash). Breadcrumbs reuse the
 * real sidebar hierarchy from `workspace-nav-data.ts` (Fulfillment > Client Hub, 97th
 * Floor Development > Palomar, Fulfillment > Team Blake, Creative processes) and
 * `deleted_by_id` references the app's one canonical roster (`TEAMS_ROSTER` /
 * `CLIENT_HUB_TEAM_ROSTER`), per this app's "one real cast of people" convention.
 */
export const TRASH_ENTRIES: TrashEntry[] = [
  {
    id: "trash-new-item",
    name: "New Item",
    type: "item",
    deleted_from: ["Fulfillment", "Client Hub"],
    deleted_by_id: "josh",
    deleted_label: "4 hr ago",
  },
  {
    id: "trash-renewal-notes",
    name: "Renewal Notes",
    type: "subitem",
    deleted_from: ["Fulfillment", "Client Hub"],
    deleted_by_id: "josh",
    deleted_label: "4 hr ago",
  },
  {
    id: "trash-client-relationship",
    name: "Client Relationship",
    type: "column",
    deleted_from: ["Fulfillment", "Client Hub"],
    deleted_by_id: "rachel",
    deleted_label: "1 day ago",
  },
  {
    id: "trash-budget",
    name: "Budget",
    type: "column",
    deleted_from: ["Fulfillment", "Client Hub"],
    deleted_by_id: "rachel",
    deleted_label: "1 day ago",
  },
  {
    id: "trash-q3-sprint-planning",
    name: "Q3 Sprint Planning",
    type: "group",
    deleted_from: ["97th Floor Development", "Palomar Roadmap & Software Engineering"],
    deleted_by_id: "blake",
    deleted_label: "1 day ago",
  },
  {
    id: "trash-status",
    name: "Status",
    type: "column",
    deleted_from: ["97th Floor Development", "Palomar Roadmap & Software Engineering"],
    deleted_by_id: "blake",
    deleted_label: "1 day ago",
  },
  {
    id: "trash-creative-brief-template",
    name: "Creative Brief Template",
    type: "doc",
    deleted_from: ["Creative processes"],
    deleted_by_id: "paxton",
    deleted_label: "2 days ago",
  },
  {
    id: "trash-q2-retrospective",
    name: "Q2 Retrospective",
    type: "dashboard",
    deleted_from: ["Fulfillment"],
    deleted_by_id: "hayley",
    deleted_label: "3 days ago",
  },
  {
    id: "trash-legacy-assets",
    name: "Legacy Assets",
    type: "board",
    deleted_from: ["Creative processes"],
    deleted_by_id: "paxton",
    deleted_label: "3 days ago",
  },
  {
    id: "trash-sprint-14-copy",
    name: "Sprint 14 (copy)",
    type: "item",
    deleted_from: ["97th Floor Development", "Palomar Roadmap & Software Engineering"],
    deleted_by_id: "blake",
    deleted_label: "3 days ago",
  },
  {
    id: "trash-onboarding-checklist",
    name: "Onboarding Checklist",
    type: "subitem",
    deleted_from: ["Fulfillment", "Team Blake"],
    deleted_by_id: "josh",
    deleted_label: "4 days ago",
  },
];

/** Seed rows for the Trash dialog's Archive tab — boards/docs hidden from workspaces but not scheduled for deletion. */
export const ARCHIVE_ENTRIES: TrashEntry[] = [
  {
    id: "archive-2023-content-calendar",
    name: "2023 Content Calendar",
    type: "board",
    deleted_from: ["97F Marketing Team", "BASE Marketing Production Calendar"],
    deleted_by_id: "jasmin",
    deleted_label: "12 days ago",
  },
  {
    id: "archive-seo-portfolio-template-v1",
    name: "SEO Portfolio Template v1",
    type: "board",
    deleted_from: ["SEO Specialists Portfolios"],
    deleted_by_id: "danny",
    deleted_label: "18 days ago",
  },
  {
    id: "archive-brand-guidelines",
    name: "Brand Guidelines",
    type: "doc",
    deleted_from: ["Creative processes"],
    deleted_by_id: "nora",
    deleted_label: "21 days ago",
  },
  {
    id: "archive-q1-performance",
    name: "Q1 Performance",
    type: "dashboard",
    deleted_from: ["Sales", "Sales Resources"],
    deleted_by_id: "mike",
    deleted_label: "1 month ago",
  },
];
