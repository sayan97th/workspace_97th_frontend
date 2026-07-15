import type { BoardColumn, BoardGroup, BoardHeaderInfo } from "@/components/board";
import type {
  BoardGroupByOption,
  BoardPersonOption,
  BoardQuickFilterFacet,
  BoardSortOption,
} from "@/components/board/toolbar/types";
import type { DrawerActivityEntry, DrawerComment, DrawerInfoBox } from "@/components/board/drawer/types";

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
  /** Real person identities for the toolbar's Person filter; does not affect TeamAvatars' rendering. */
  assigned_person_ids: string[];
  /** The group this row was authored into, so "Group by: Default" can be reconstructed after regrouping. */
  default_group_id: string;
};

/** Shared roster backing the toolbar's Person filter, matching the approved Client Hub design's account people list. */
export const CLIENT_HUB_TEAM_ROSTER: BoardPersonOption[] = [
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

/** Fixed column layout for the Client Hub "Main table" view. */
export const CLIENT_HUB_COLUMNS: BoardColumn[] = [
  {
    id: "item",
    label: "Item",
    width: 252,
    hideable: false,
    full_label: "Name",
    swatch: { accent_color: "#7e5bef", glyph: "Tt" },
  },
  { id: "chat", label: "", width: 56, align: "center", hideable: false, pinnable: false },
  {
    id: "client",
    label: "Client ...",
    width: 70,
    full_label: "Client Relationship",
    swatch: { accent_color: "#fdab3d", glyph: "Cr", glyph_text_color: "#3a2a00" },
  },
  {
    id: "team",
    label: "Team",
    width: 118,
    swatch: { accent_color: "#579bfc", glyph: "Te" },
  },
  {
    id: "products",
    label: "Product(s)",
    width: 152,
    swatch: { accent_color: "#00c875", glyph: "Pr" },
  },
  {
    id: "kpi",
    label: "KPI",
    width: 150,
    swatch: { accent_color: "#2b76e5", glyph: "K" },
  },
  {
    id: "status",
    label: "Status",
    width: 128,
    align: "center",
    bleed: true,
    swatch: { accent_color: "#00c875", glyph: "St" },
  },
  {
    id: "partner",
    label: "Partner Program",
    width: 150,
    align: "center",
    bleed: true,
    swatch: { accent_color: "#a358df", glyph: "Pp" },
  },
  {
    id: "start",
    label: "Start of Current Contract",
    width: 180,
    swatch: { accent_color: "#17a2b8", glyph: "Sc" },
  },
  {
    id: "end",
    label: "End of Contract",
    width: 150,
    swatch: { accent_color: "#d14fa0", glyph: "Ec" },
  },
];

/** Raw row shape used to author the seed data compactly. */
type RawRow = Omit<ClientRow, "id" | "team_seed" | "assigned_person_ids" | "default_group_id">;

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
    default_group_id: id,
    assigned_person_ids: Array.from(
      { length: row.team_count },
      (_, member_index) =>
        CLIENT_HUB_TEAM_ROSTER[(index + member_index) % CLIENT_HUB_TEAM_ROSTER.length].id
    ),
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

const CLIENT_HUB_ALL_ROWS = CLIENT_HUB_GROUPS.flatMap((group) => group.rows);

const uniqueValues = (values: string[]): string[] => Array.from(new Set(values));

const findRosterMember = (person_id: string) =>
  CLIENT_HUB_TEAM_ROSTER.find((member) => member.id === person_id);

/** Renders a row's value for a given column id — powers Advanced Filters and column-scoped search. */
export const getClientColumnText = (row: ClientRow, column_id: string): string => {
  switch (column_id) {
    case "item":
      return row.name;
    case "chat":
      return String(row.chat_count);
    case "client":
      return row.client_tag ?? "";
    case "team":
      return row.assigned_person_ids
        .map((person_id) => findRosterMember(person_id)?.name ?? "")
        .join(", ");
    case "products":
      return row.products.join(", ");
    case "kpi":
      return row.kpi ?? "";
    case "status":
      return CLIENT_STATUS[row.status].label;
    case "partner":
      return row.has_partner ? "Referral" : "";
    case "start":
      return row.start ?? "";
    case "end":
      return row.end ?? "";
    default:
      return "";
  }
};

export const CLIENT_HUB_SORT_OPTIONS: BoardSortOption<ClientRow>[] = [
  {
    id: "item",
    label: "Item",
    getValue: (row) => row.name,
    swatch: { accent_color: "#7e5bef", glyph: "Tt" },
  },
  {
    id: "chat",
    label: "Updates",
    getValue: (row) => row.chat_count,
    swatch: { accent_color: "#fdab3d", glyph: "Up" },
  },
  {
    id: "team",
    label: "Team size",
    getValue: (row) => row.team_count,
    swatch: { accent_color: "#579bfc", glyph: "Te" },
  },
  {
    id: "kpi",
    label: "KPI",
    getValue: (row) => row.kpi ?? "",
    swatch: { accent_color: "#2b76e5", glyph: "K" },
  },
  {
    id: "status",
    label: "Status",
    getValue: (row) => ({ active: 0, renewal: 1, expired: 2 }[row.status]),
    swatch: { accent_color: "#00c875", glyph: "St" },
  },
  {
    id: "start",
    label: "Start of Current Contract",
    getValue: (row) => row.start ?? "",
    swatch: { accent_color: "#17a2b8", glyph: "Sc" },
  },
  {
    id: "end",
    label: "End of Contract",
    getValue: (row) => row.end ?? "",
    swatch: { accent_color: "#d14fa0", glyph: "Ec" },
  },
];

const GROUP_BY_FALLBACK_COLOR = "#8fb4c9";

export const CLIENT_HUB_GROUP_BY_OPTIONS: BoardGroupByOption<ClientRow>[] = [
  { id: "default", label: "Default" },
  {
    id: "status",
    label: "Status",
    getGroupKey: (row) => row.status,
    getGroupLabel: (key) => CLIENT_STATUS[key as ClientStatusKey]?.label ?? key,
    getGroupColor: (key) => CLIENT_STATUS[key as ClientStatusKey]?.bg ?? GROUP_BY_FALLBACK_COLOR,
    swatch: { accent_color: "#00c875", glyph: "St" },
  },
  {
    id: "team",
    label: "Team",
    getGroupKey: (row) => row.assigned_person_ids[0] ?? "unassigned",
    getGroupLabel: (key) => findRosterMember(key)?.name ?? "Unassigned",
    getGroupColor: () => GROUP_BY_FALLBACK_COLOR,
    swatch: { accent_color: "#579bfc", glyph: "Te" },
  },
  {
    id: "product",
    label: "Product(s)",
    getGroupKey: (row) => row.products[0] ?? "none",
    getGroupLabel: (key) => (key === "none" ? "No product" : key),
    getGroupColor: () => GROUP_BY_FALLBACK_COLOR,
    swatch: { accent_color: "#00c875", glyph: "Pr" },
  },
  {
    id: "kpi",
    label: "KPI",
    getGroupKey: (row) => row.kpi ?? "blank",
    getGroupLabel: (key) => (key === "blank" ? "Blank" : key),
    getGroupColor: () => GROUP_BY_FALLBACK_COLOR,
    swatch: { accent_color: "#2b76e5", glyph: "K" },
  },
];

export const CLIENT_HUB_QUICK_FILTER_FACETS: BoardQuickFilterFacet<ClientRow>[] = [
  {
    id: "group",
    label: "Group",
    options: CLIENT_HUB_GROUPS.map((group) => ({ id: group.id, label: group.name })),
    getOptionIds: (row) => [row.default_group_id],
  },
  {
    id: "client_relationship",
    label: "Client Relationship",
    options: uniqueValues(CLIENT_HUB_ALL_ROWS.map((row) => row.client_tag ?? "blank")).map((tag) => ({
      id: tag,
      label: tag === "blank" ? "Blank" : tag,
    })),
    getOptionIds: (row) => [row.client_tag ?? "blank"],
  },
  {
    id: "team",
    label: "Team",
    options: CLIENT_HUB_TEAM_ROSTER.map((member) => ({
      id: member.id,
      label: member.name,
      person_id: member.id,
    })),
    getOptionIds: (row) => row.assigned_person_ids,
  },
  {
    id: "products",
    label: "Product(s)",
    options: uniqueValues(CLIENT_HUB_ALL_ROWS.flatMap((row) => row.products)).map((product) => ({
      id: product,
      label: product,
    })),
    getOptionIds: (row) => row.products,
  },
  {
    id: "kpi",
    label: "KPI",
    options: uniqueValues(CLIENT_HUB_ALL_ROWS.map((row) => row.kpi ?? "blank")).map((kpi) => ({
      id: kpi,
      label: kpi === "blank" ? "Blank" : kpi,
    })),
    getOptionIds: (row) => [row.kpi ?? "blank"],
  },
  {
    id: "status",
    label: "Status",
    options: (Object.keys(CLIENT_STATUS) as ClientStatusKey[]).map((key) => ({
      id: key,
      label: CLIENT_STATUS[key].label,
      dot_color: CLIENT_STATUS[key].bg,
    })),
    getOptionIds: (row) => [row.status],
  },
];

// ---------------------------------------------------------------------------
// Item detail drawer seed data
// ---------------------------------------------------------------------------

/** The signed-in user for the drawer's composer avatar and posted comments. */
export const CLIENT_HUB_CURRENT_USER: BoardPersonOption = CLIENT_HUB_TEAM_ROSTER[2]; // Brandon Stewart

/** Everyone selectable from the `@mention` picker in the drawer's composer/reply boxes. */
export const CLIENT_HUB_MENTIONABLE_PEOPLE: BoardPersonOption[] = CLIENT_HUB_TEAM_ROSTER;

/**
 * "Board info" popover content for the title chevron. Client Hub is a hand-authored
 * board seeded straight into the frontend (it has no backing `workspace_navigation_items`
 * row), so its board type isn't editable here the way a real, API-backed board's is.
 */
export const CLIENT_HUB_BOARD_INFO: BoardHeaderInfo = {
  description:
    "Adjust Client Relationship Status with EMOJI: (the emojis are in the drop down in the column) ✅: Good - we're hitting their goals, ⚠️: Caution - yellow flags are flying, 🚩: Alert - things are bad!!!, 🚀: Opportunity - possibility for upsell or new service",
  board_type: "private",
  owners: [
    { id: "josh", full_name: "Josh Moody" },
    { id: "blake", full_name: "Blake Denton" },
    { id: "brandon", full_name: "Brandon Stewart" },
    { id: "rachel", full_name: "Rachel Tonkovich" },
  ],
  created_by: "Josh Moody",
  created_at: "Dec 2, 2019",
  notifications: "Everything",
};

const brandon = CLIENT_HUB_CURRENT_USER;
const mike = CLIENT_HUB_TEAM_ROSTER[10]; // Mike Powell

/** Hand-authored thread for the FranklinCovey AUS/NZ row, matching the approved Client Hub design. */
const FRANKLINCOVEY_AUNZ_COMMENTS: DrawerComment[] = [
  {
    id: "active-3-c1",
    author: mike,
    posted_at: "Aug 2025",
    body: '@Brandon Stewart I had a productive meeting with Kayleigh about au/nz "leadership" ranking. The leadership blog post on the separate language/region pages have no hreflang tags and are exactly the same. We talked about escalating the hreflang issue with their dev team and potentially diversifying the article on leadership.',
    view_count: 5,
    liked_by_me: false,
    like_count: 0,
    seen: true,
    attachments: [],
    reactions: [],
    replies: [
      {
        id: "active-3-c1-r1",
        author: brandon,
        posted_at: "Aug 2025",
        body: "@Mike Powell thanks for looking into this. Would we need to diversify if the hreflang tags are set up properly? Or is the diversifying a precaution in case the hreflang tags are not all implemented correctly?",
        view_count: 5,
        liked_by_me: false,
        like_count: 0,
        reactions: [],
      },
      {
        id: "active-3-c1-r2",
        author: mike,
        posted_at: "Aug 2025",
        body: "No need to diversify if the hreflang tags are set up correctly! Diversifying the content was a plan B as Kayleigh mentioned you guys have had trouble getting the dev team to prioritize those language tags.",
        view_count: 5,
        liked_by_me: false,
        like_count: 0,
        reactions: [],
      },
    ],
  },
  {
    id: "active-3-c2",
    author: brandon,
    posted_at: "22d",
    body: "They have reached out to us and let us know that they will be opting out at the end of June. The team has greatly appreciated working with us, but their management is being very cautious with their spend.\n\nWe've gotten great results for them over the past year.",
    view_count: 1,
    liked_by_me: false,
    like_count: 0,
    seen: false,
    attachments: [],
    reactions: [],
    replies: [],
  },
  {
    id: "active-3-c3",
    author: brandon,
    posted_at: "May 8",
    body: "Things are going well. We're still trying to get them to sign the new SOW because their procurement department keeps pushing back that there's an existing SOW, but it's for the corporate site. All is going well, and we've sent them an update on metrics over the last 12 months showing the continual growth they've had.",
    view_count: 3,
    liked_by_me: true,
    like_count: 2,
    seen: true,
    attachments: [],
    reactions: [],
    replies: [],
  },
];

const CLIENT_HUB_SEEDED_COMMENTS: Record<string, DrawerComment[]> = {
  "active-3": FRANKLINCOVEY_AUNZ_COMMENTS,
};

/** Seeds a row's comment thread the first time its drawer opens: the hand-authored FranklinCovey thread, or a generic starter comment for every other row. */
export const getClientHubInitialComments = (row: ClientRow): DrawerComment[] => {
  const seeded = CLIENT_HUB_SEEDED_COMMENTS[row.id];
  if (seeded) return seeded;
  return [
    {
      id: `${row.id}-c1`,
      author: CLIENT_HUB_CURRENT_USER,
      posted_at: "3d",
      body: `Kicking off the update thread for ${row.name}. Drop status notes, blockers, and @mention teammates here to keep everyone in the loop.`,
      view_count: 2,
      liked_by_me: false,
      like_count: 0,
      seen: false,
      attachments: [],
      reactions: [],
      replies: [],
    },
  ];
};

/** Read-only Contract / Key Dates / Products summary cards for the drawer's "Info Boxes" tab. */
export const getClientHubInfoBoxes = (row: ClientRow): DrawerInfoBox[] => {
  const owner = findRosterMember(row.assigned_person_ids[0])?.name ?? "Unassigned";
  return [
    {
      id: "contract",
      label: "CONTRACT",
      accent_color: CLIENT_STATUS[row.status].bg,
      rows: [
        { label: "Item", value: row.name },
        { label: "Status", value: CLIENT_STATUS[row.status].label },
        { label: "KPI", value: row.kpi ?? "Not set" },
        { label: "Owner", value: owner },
      ],
    },
    {
      id: "key_dates",
      label: "KEY DATES",
      accent_color: "#579bfc",
      rows: [
        { label: "Start date", value: row.start ?? "Not set" },
        { label: "End date", value: row.end ?? "Not set" },
      ],
    },
    {
      id: "products",
      label: "PRODUCTS",
      accent_color: "#a358df",
      rows: [
        { label: "Services", value: row.products.join(", ") },
        { label: "Partner program", value: row.has_partner ? "Referral" : "None" },
      ],
    },
  ];
};

/** Generic created/status/update activity entries for the drawer's "Activity Log" tab. */
export const getClientHubActivityLog = (row: ClientRow): DrawerActivityEntry[] => {
  const owner = findRosterMember(row.assigned_person_ids[0]) ?? CLIENT_HUB_CURRENT_USER;
  const collaborator =
    findRosterMember(row.assigned_person_ids[1] ?? row.assigned_person_ids[0]) ?? CLIENT_HUB_CURRENT_USER;
  return [
    {
      id: `${row.id}-a1`,
      actor: owner,
      verb: "created this item",
      occurred_at: "Aug 12, 2025 · 9:14 AM",
      accent_color: "#00c875",
    },
    {
      id: `${row.id}-a2`,
      actor: collaborator,
      verb: `changed Status to ${CLIENT_STATUS[row.status].label}`,
      occurred_at: "Aug 14, 2025 · 2:03 PM",
      accent_color: "#579bfc",
    },
    {
      id: `${row.id}-a3`,
      actor: owner,
      verb: "added an update",
      occurred_at: "Sep 2, 2025 · 11:20 AM",
      accent_color: "#a358df",
    },
  ];
};
