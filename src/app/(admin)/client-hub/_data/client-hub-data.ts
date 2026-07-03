import type { BoardColumn, BoardGroup } from "@/components/board";

export type ClientStatusKey = "active" | "renewal" | "expired";

export type ClientStatus = {
  label: string;
  bg: string;
  color: string;
};

/** Status colour map, matching the approved Client Hub design. */
export const CLIENT_STATUS: Record<ClientStatusKey, ClientStatus> = {
  active: { label: "Active", bg: "#00c875", color: "#04241a" },
  renewal: { label: "Renewal", bg: "#f5b731", color: "#3a2a00" },
  expired: { label: "Expired", bg: "#e2445c", color: "#ffffff" },
};

/** A single contract row on the Client Hub board. */
export type ClientRow = {
  id: string;
  name: string;
  has_star?: boolean;
  sub_items_count?: number;
  chat_count: number;
  client_tag?: string;
  team_count: number;
  team_extra?: number;
  /** Seed so stacked avatars vary per row. */
  team_seed: number;
  products: string[];
  product_extra?: number;
  kpi?: string;
  status: ClientStatusKey;
  has_partner?: boolean;
  start?: string;
  end?: string;
};

/** Fixed column layout for the Client Hub "Main table" view. */
export const CLIENT_HUB_COLUMNS: BoardColumn[] = [
  { id: "item", label: "Item", width: 252 },
  { id: "chat", label: "", width: 56, align: "center" },
  { id: "client", label: "Client ...", width: 70 },
  { id: "team", label: "Team", width: 118 },
  { id: "products", label: "Product(s)", width: 152 },
  { id: "kpi", label: "KPI", width: 150 },
  { id: "status", label: "Status", width: 128, align: "center", bleed: true },
  { id: "partner", label: "Partner Program", width: 150, align: "center", bleed: true },
  { id: "start", label: "Start of Current Contract", width: 180 },
  { id: "end", label: "End of Contract", width: 150 },
];

/** Raw row shape used to author the seed data compactly. */
type RawRow = Omit<ClientRow, "id" | "team_seed">;

const buildGroup = (
  id: string,
  name: string,
  rows: RawRow[]
): BoardGroup<ClientRow> => ({
  id,
  name,
  accent_color: "#00c875",
  rows: rows.map((row, index) => ({
    ...row,
    id: `${id}-${index}`,
    team_seed: index,
  })),
});

export const CLIENT_HUB_GROUPS: BoardGroup<ClientRow>[] = [
  buildGroup("active", "Active Contracts", [
    { name: "Hale Centre Theatre - Arizona", client_tag: "#v", chat_count: 46, team_count: 1, products: ["Ads"], kpi: "PPC", status: "active", start: "Apr 20, 2021" },
    { name: "Hale Centre Theatre - Sandy", client_tag: "#v", chat_count: 14, team_count: 1, products: ["Ads"], kpi: "PPC", status: "active", start: "Mar 1, 2021" },
    { name: "Global Citizen Year/Tilting Futures", client_tag: "#v", chat_count: 52, team_count: 1, products: ["Content", "SEO"], kpi: "Deliverables", status: "active", start: "Sep 1, 2023", end: "Jun 30, 2024" },
    { name: "FranklinCovey AUS/NZ", sub_items_count: 4, client_tag: "#v", chat_count: 18, team_count: 1, products: ["SEO", "Content"], status: "active" },
    { name: "Sold.com", has_star: true, client_tag: "#!", chat_count: 40, team_count: 2, products: ["Content"], product_extra: 3, kpi: "PPC", status: "active", start: "Mar 1, 2021", end: "Feb 28, 2025" },
    { name: "Salesforce", has_star: true, chat_count: 127, team_count: 1, products: ["SEO"], kpi: "Links, SEO Consul...", status: "active", start: "Jan 1, 2020" },
    { name: "Princess Cruises", has_star: true, sub_items_count: 4, chat_count: 27, team_count: 2, team_extra: 2, products: ["SEO"], kpi: "Organic Traffic", status: "active", start: "Mar 1, 2024", end: "Nov 30, 2024" },
    { name: "Schneider Electric", client_tag: "#v", chat_count: 114, team_count: 1, products: ["SEO"], product_extra: 2, kpi: "SEO, Content, PP...", status: "active", start: "Mar 17, 2020" },
    { name: "Plaza Tire", client_tag: "#v", chat_count: 46, team_count: 1, products: ["Ads"], kpi: "Calls, Quotes, Pur...", status: "active", start: "Jul 1, 2024" },
    { name: "Blue Haven", has_star: true, client_tag: "#v", chat_count: 59, team_count: 1, team_extra: 3, products: ["SEO"], kpi: "Links, SEO Consul...", status: "active", start: "Jan 1, 2020", end: "Jul 31, 2024" },
    { name: "Weave", sub_items_count: 4, client_tag: "#v", chat_count: 23, team_count: 1, products: ["SEO", "Content"], kpi: "Deliverables", status: "active", start: "Sep 19, 2023", end: "Mar 18, 2024" },
    { name: "College Ave", chat_count: 39, team_count: 1, products: ["SEO", "Content"], kpi: "Deliverables, key...", status: "active", start: "Feb 1, 2023", end: "Mar 31, 2024" },
    { name: "FranklinCovey", has_star: true, client_tag: "#!", chat_count: 44, team_count: 2, products: ["Content"], product_extra: 2, kpi: "Deliverables", status: "active", start: "Jul 1, 2021" },
    { name: "Check Point", client_tag: "#!", chat_count: 25, team_count: 1, products: ["Content"], kpi: "Deliverables", status: "active", start: "Sep 1, 2021" },
    { name: "Proponent", client_tag: "#v", chat_count: 57, team_count: 1, products: ["SEO"], kpi: "SEO", status: "active", start: "Sep 1, 2025", end: "Aug 31" },
    { name: "Holland America", sub_items_count: 4, client_tag: "#v", chat_count: 3, team_count: 1, products: ["SEO", "Content"], kpi: "Organic Traffic", status: "active", start: "Sep 1, 2025", end: "Aug 31" },
    { name: "Ontraport", sub_items_count: 4, chat_count: 7, team_count: 1, products: ["Ads"], product_extra: 2, status: "active", start: "Sep 1, 2025", end: "Aug 31" },
    { name: "Andy Frisella", has_star: true, client_tag: "#v", chat_count: 14, team_count: 1, products: ["Content"], product_extra: 2, kpi: "Deliverables", status: "active", start: "Aug 1, 2021", end: "Jul 31, 2025" },
  ]),
  buildGroup("optout", "Opt Out Period", []),
  buildGroup("renewal", "Renewal Period", [
    { name: "EasyPost", has_star: true, sub_items_count: 4, client_tag: "#v", chat_count: 35, team_count: 2, products: ["SEO"], kpi: "Organic Traffic", status: "renewal", start: "Jul 1, 2025", end: "Dec 31, 2025" },
    { name: "CardCash", has_star: true, sub_items_count: 4, client_tag: "#v", chat_count: 10, team_count: 2, products: ["Ads"], kpi: "PPC", status: "renewal", has_partner: true, start: "Feb 15, 2025", end: "Feb 14" },
    { name: "Sellify", sub_items_count: 4, chat_count: 1, team_count: 1, products: ["SEO"], kpi: "Organic Traffic, C...", status: "renewal", start: "Oct 1, 2025", end: "Mar 31" },
    { name: "Faye", sub_items_count: 4, client_tag: "#v", chat_count: 9, team_count: 1, products: ["Ads"], kpi: "PPC", status: "renewal", start: "Apr 15, 2025", end: "Apr 14" },
    { name: "PeopleFinders", sub_items_count: 4, chat_count: 5, team_count: 1, products: ["SEO", "Ads"], kpi: "SEO, Content", status: "renewal", start: "Nov 1, 2025", end: "Apr 30" },
    { name: "Prescient AI", sub_items_count: 4, client_tag: "#v", chat_count: 10, team_count: 2, products: ["Ads"], kpi: "PPC", status: "expired", start: "Jun 1, 2025", end: "May 31" },
    { name: "Pro Athlete", client_tag: "#v", chat_count: 41, team_count: 1, products: ["SEO", "Content"], kpi: "Organic Traffic", status: "renewal", start: "Jun 1, 2025", end: "May 31" },
    { name: "CPS HR", sub_items_count: 4, client_tag: "#v", chat_count: 20, team_count: 1, products: ["SEO", "Content"], kpi: "Organic Traffic", status: "renewal", has_partner: true, start: "Jul 1, 2025", end: "Jun 30" },
    { name: "Acrisure", has_star: true, client_tag: "#v", chat_count: 40, team_count: 1, products: ["SEO", "Content"], kpi: "Deliverables", status: "renewal", has_partner: true, start: "Jan 1", end: "Jun 30" },
    { name: "Marksmen", sub_items_count: 4, client_tag: "#!!", chat_count: 6, team_count: 1, products: ["Ads"], kpi: "Cost Per Lead", status: "expired", start: "Jul 18, 2025", end: "Jun 30" },
    { name: "KORE", sub_items_count: 4, client_tag: "#v", chat_count: 29, team_count: 2, products: ["SEO"], kpi: "Organic Traffic", status: "expired", start: "Aug 1, 2025", end: "Jul 31" },
  ]),
];

export const CLIENT_HUB_VIEWS = [
  "Timeline",
  "Blake",
  "Sam",
  "Chart",
  "SEO Department",
  "Jon",
  "Marketing",
  "Danny",
  "Brandon",
  "Mike",
  "Blake",
  "Jasmin",
];
