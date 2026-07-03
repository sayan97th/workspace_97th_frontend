/**
 * Seed data for the Workspace home "Content" tab table.
 *
 * Mirrors the approved Claude design: a flat list of workspace assets rendered
 * in a spreadsheet-style table (asset name, AI summary, creator, dates, folder).
 * Field names are snake_case to match the project data conventions.
 */

export type CreatorKey = "josh" | "blake" | "hayley" | "rachel" | "paxton";

export type Creator = {
  initials: string;
  name: string;
  /** Avatar gradient stops (rendered as an inline linear-gradient). */
  gradient_from: string;
  gradient_to: string;
};

/** Creator directory keyed by a short id used on each asset row. */
export const WORKSPACE_CREATORS: Record<CreatorKey, Creator> = {
  josh: { initials: "JM", name: "Josh Moody", gradient_from: "#e5623e", gradient_to: "#8a2018" },
  blake: { initials: "BL", name: "Blake", gradient_from: "#5b7c99", gradient_to: "#2e4257" },
  hayley: { initials: "HR", name: "Hayley Robinson", gradient_from: "#9c6ba0", gradient_to: "#5a347a" },
  rachel: { initials: "RT", name: "Rachel Tonkovich", gradient_from: "#6b9c8a", gradient_to: "#347a5a" },
  paxton: { initials: "PG", name: "Paxton Gray", gradient_from: "#c6913b", gradient_to: "#7a5a34" },
};

export type AssetType = "board" | "doc" | "dashboard" | "workflow";

/** A single asset row in the workspace content table. */
export type ContentAsset = {
  id: string;
  name: string;
  type: AssetType;
  creator: CreatorKey;
  created_date: string;
  modified_date: string;
  folder: string;
  sub_folder?: string | null;
  is_favorite?: boolean;
  is_locked?: boolean;
};

export const WORKSPACE_CONTENT_ASSETS: ContentAsset[] = [
  { id: "team-blake", name: "Team Blake", type: "board", creator: "josh", created_date: "Nov 18, 2019", modified_date: "Mar 30, 2026", folder: "Fulfillment" },
  { id: "client-hub", name: "Client Hub", type: "board", creator: "josh", created_date: "Dec 3, 2019", modified_date: "Jun 12, 2026", folder: "Fulfillment", is_favorite: true },
  { id: "palomar", name: "Palomar Roadmap & Software Engineering", type: "board", creator: "rachel", created_date: "Jul 8, 2021", modified_date: "Mar 24, 2024", folder: "97th Floor Development", is_locked: true },
  { id: "web-dev", name: "97th Floor Web Dev", type: "board", creator: "blake", created_date: "Sep 21, 2021", modified_date: "Feb 24, 2025", folder: "97th Floor Development", is_locked: true },
  { id: "seo-portfolio", name: "SEO Portfolio Template", type: "doc", creator: "hayley", created_date: "Jan 5, 2022", modified_date: "Oct 8, 2025", folder: "SEO Specialists Portfolios" },
  { id: "sprints", name: "Sprints", type: "board", creator: "blake", created_date: "Feb 7, 2022", modified_date: "Jan 30, 2025", folder: "97th Floor Development", sub_folder: "97th Dev" },
  { id: "roadmap", name: "Roadmap", type: "board", creator: "blake", created_date: "Feb 7, 2022", modified_date: "Aug 9, 2024", folder: "97th Floor Development", sub_folder: "97th Dev" },
  { id: "bugs-queue", name: "Bugs Queue", type: "board", creator: "blake", created_date: "Feb 7, 2022", modified_date: "Mar 24, 2024", folder: "97th Floor Development", sub_folder: "97th Dev" },
  { id: "retrospectives", name: "Retrospectives", type: "board", creator: "blake", created_date: "Feb 7, 2022", modified_date: "Mar 24, 2024", folder: "97th Floor Development", sub_folder: "97th Dev" },
  { id: "sales-resources", name: "Sales Resources", type: "doc", creator: "hayley", created_date: "Oct 17, 2023", modified_date: "Jul 11, 2024", folder: "Sales" },
  { id: "podcast-production", name: "Podcast production", type: "doc", creator: "rachel", created_date: "Mar 13, 2024", modified_date: "Dec 5, 2025", folder: "Program Development" },
  { id: "creative-processes", name: "Creative Processes", type: "doc", creator: "paxton", created_date: "Jun 10, 2024", modified_date: "Jun 10, 2024", folder: "Creative processes", sub_folder: "Creative Processes" },
  { id: "base-marketing", name: "BASE Marketing Production Calendar", type: "doc", creator: "paxton", created_date: "Sep 20, 2024", modified_date: "Apr 22, 2026", folder: "97F Marketing Team" },
  { id: "team-jaecie", name: "Team Jaecie", type: "board", creator: "josh", created_date: "Dec 16, 2024", modified_date: "Jun 22, 2026", folder: "Fulfillment" },
];
