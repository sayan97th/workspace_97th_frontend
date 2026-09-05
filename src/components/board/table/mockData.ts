import type { ColumnDef, BoardTableGroup } from "./types";

const base_columns: ColumnDef[] = [
  { id: "owner", title: "Owner", kind: "people", width: 108 },
  { id: "status", title: "Status", kind: "status", width: 156 },
  { id: "date", title: "Date", kind: "date", width: 148 },
  { id: "priority", title: "Priority", kind: "label", width: 132 },
  { id: "progress", title: "Progress", kind: "progress", width: 156 },
  { id: "notes", title: "Notes", kind: "text", width: 210, align_left: true },
  { id: "est", title: "Est. h", kind: "number", width: 110 },
  { id: "sprint", title: "Sprint", kind: "text", width: 130 },
  { id: "updated", title: "Updated", kind: "date", width: 150 },
];

const sub_base_columns: ColumnDef[] = [
  { id: "owner", title: "Owner", kind: "people", width: 108 },
  { id: "status", title: "Status", kind: "status", width: 156 },
  { id: "date", title: "Date", kind: "date", width: 148 },
];

const clone_columns = (cols: ColumnDef[]) => cols.map((c) => ({ ...c }));

export function buildInitialGroups(): BoardTableGroup[] {
  return [
    {
      key: "A",
      title: "Checkout revamp",
      color: "#4f6bed",
      tint: "#c3cef9",
      is_priority: true,
      item_title: "Item",
      sub_title: "Subitem",
      base_columns: clone_columns(base_columns),
      sub_base_columns: clone_columns(sub_base_columns),
      custom_columns: [],
      sub_custom_columns: [],
      items: [
        {
          id: "i1",
          name: "Payment method selector",
          values: {
            owner: ["AR", "LM"], status: "Working on it", date: "2026-09-17", priority: "High", progress: "60",
            notes: "Blocked on PSP contract sign-off", est: "18", sprint: "S-24", updated: "2026-08-28",
          },
          subs: [
            { id: "i1-s1", name: "Card tokenization spike", values: { owner: ["AR"], status: "Done", date: "2026-09-08" } },
            { id: "i1-s2", name: "Apple Pay / Google Pay sheet", values: { owner: ["LM", "DK", "MR"], status: "Working on it", date: "2026-09-19" } },
            { id: "i1-s3", name: "Saved cards empty state", values: { owner: [], status: "", date: "" } },
          ],
        },
        {
          id: "i2",
          name: "Guest checkout flow",
          values: {
            owner: ["LM", "DK", "MR", "JS", "TP"], status: "Stuck", date: "2026-09-24", priority: "Critical", progress: "25",
            notes: "Fraud rules need legal review", est: "34", sprint: "S-24", updated: "2026-08-30",
          },
          subs: [
            { id: "i2-s1", name: "Email-only identity step", values: { owner: ["LM", "JS"], status: "Working on it", date: "2026-09-22" } },
            { id: "i2-s2", name: "Merge guest order on signup", values: { owner: ["DK"], status: "", date: "" } },
            { id: "i2-s3", name: "Fraud review threshold", values: { owner: [], status: "Stuck", date: "2026-09-30" } },
            { id: "i2-s4", name: "Legal copy review", values: { owner: ["MR", "TP"], status: "", date: "" } },
          ],
        },
        {
          id: "i3",
          name: "Address autocomplete",
          values: {
            owner: ["DK", "AR"], status: "Working on it", date: "2026-10-02", priority: "Medium", progress: "45",
            notes: "Provider picked, contract pending", est: "12", sprint: "S-25", updated: "2026-08-26",
          },
          subs: [
            { id: "i3-s1", name: "Provider evaluation", values: { owner: ["DK"], status: "Done", date: "2026-09-05" } },
            { id: "i3-s2", name: "Fallback manual entry", values: { owner: ["AR", "MR"], status: "Working on it", date: "2026-10-01" } },
          ],
        },
        {
          id: "i4",
          name: "Order summary redesign",
          values: {
            owner: ["MR"], status: "Done", date: "2026-08-29", priority: "Low", progress: "100",
            notes: "Shipped behind flag", est: "8", sprint: "S-23", updated: "2026-08-21",
          },
          subs: [],
        },
      ],
    },
    {
      key: "B",
      title: "Discovery",
      color: "#2f9e78",
      tint: "#a9dcc9",
      is_priority: false,
      item_title: "Item",
      sub_title: "Subitem",
      base_columns: clone_columns(base_columns),
      sub_base_columns: clone_columns(sub_base_columns),
      custom_columns: [],
      sub_custom_columns: [],
      items: [
        {
          id: "b1",
          name: "Post-purchase survey",
          values: {
            owner: ["MR"], status: "Working on it", date: "2026-10-09", priority: "Low", progress: "35",
            notes: "Draft questions in Notion", est: "5", sprint: "S-25", updated: "2026-08-29",
          },
          subs: [
            { id: "b1-s1", name: "Draft question set", values: { owner: ["MR"], status: "Done", date: "" } },
            { id: "b1-s2", name: "Pilot with 5 customers", values: { owner: ["AR", "LM"], status: "Working on it", date: "" } },
            { id: "b1-s3", name: "Wire results to Amplitude", values: { owner: [], status: "", date: "" } },
          ],
        },
        {
          id: "b2",
          name: "Churn interview round 2",
          values: {
            owner: ["AR"], status: "", date: "", priority: "Medium", progress: "10",
            notes: "Recruiting 6 participants", est: "9", sprint: "S-26", updated: "2026-08-27",
          },
          subs: [
            { id: "b2-s1", name: "Recruit 6 participants", values: { owner: ["AR"], status: "Working on it", date: "" } },
            { id: "b2-s2", name: "Interview guide review", values: { owner: [], status: "", date: "" } },
          ],
        },
      ],
    },
  ];
}
