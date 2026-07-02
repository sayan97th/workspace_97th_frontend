export type WorkspaceLeafNode = {
  type: "leaf";
  id: string;
  label: string;
  /** Only "clienthub" is favorited in the current mockup. */
  favorite?: boolean;
  /** Only "program" renders with group-header styling despite having no children. */
  display_style?: "group";
};

export type WorkspaceGroupNode = {
  type: "group";
  id: string;
  label: string;
  children: WorkspaceTreeNode[];
};

export type WorkspaceTreeNode = WorkspaceLeafNode | WorkspaceGroupNode;

export const workspace_nav_tree: WorkspaceTreeNode[] = [
  { type: "leaf", id: "home", label: "Workspace home" },
  { type: "leaf", id: "clienthub", label: "Client Hub", favorite: true },
  {
    type: "group",
    id: "dev",
    label: "97th Floor Development",
    children: [
      {
        type: "leaf",
        id: "palomar",
        label: "Palomar Roadmap & Software Engineering",
      },
      { type: "leaf", id: "webdev", label: "97th Floor Web Dev" },
      {
        type: "group",
        id: "dev97",
        label: "97th Dev",
        children: [
          { type: "leaf", id: "sprints", label: "Sprints" },
          { type: "leaf", id: "roadmap", label: "Roadmap" },
          { type: "leaf", id: "bugs", label: "Bugs Queue" },
          { type: "leaf", id: "retro", label: "Retrospectives" },
        ],
      },
    ],
  },
  {
    type: "group",
    id: "fulfillment",
    label: "Fulfillment",
    children: [
      { type: "leaf", id: "teamblake", label: "Team Blake" },
      { type: "leaf", id: "teamjaecie", label: "Team Jaecie" },
    ],
  },
  {
    type: "group",
    id: "sales",
    label: "Sales",
    children: [{ type: "leaf", id: "salesres", label: "Sales Resources" }],
  },
  {
    type: "leaf",
    id: "program",
    label: "Program Development",
    display_style: "group",
  },
  {
    type: "group",
    id: "marketing",
    label: "97F Marketing Team",
    children: [
      {
        type: "leaf",
        id: "base",
        label: "BASE Marketing Production Calendar",
      },
    ],
  },
  {
    type: "group",
    id: "seo",
    label: "SEO Specialists Portfolios",
    children: [{ type: "leaf", id: "seotpl", label: "SEO Portfolio Template" }],
  },
  {
    type: "group",
    id: "creative",
    label: "Creative processes",
    children: [
      {
        type: "group",
        id: "creativeInner",
        label: "Creative Processes",
        children: [
          { type: "leaf", id: "cproc", label: "Creative Processes" },
          { type: "leaf", id: "dam", label: "Asset Library (DAM)" },
        ],
      },
    ],
  },
];

export const all_group_ids = [
  "dev",
  "dev97",
  "fulfillment",
  "sales",
  "marketing",
  "seo",
  "creative",
  "creativeInner",
];
