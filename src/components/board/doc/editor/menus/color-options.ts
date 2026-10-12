/** Text and highlight colors offered by the Style menu and the selection bubble, monday's doc palette. */
export type DocColorOption = { label: string; text: string; highlight: string };

export const DOC_COLORS: DocColorOption[] = [
  { label: "Gray", text: "#676879", highlight: "#e6e9ef" },
  { label: "Red", text: "#d83a52", highlight: "#fbe9ec" },
  { label: "Orange", text: "#e2733b", highlight: "#fdeee3" },
  { label: "Yellow", text: "#c29400", highlight: "#fff4cc" },
  { label: "Green", text: "#00854d", highlight: "#e1f7ec" },
  { label: "Blue", text: "#0073ea", highlight: "#dceeff" },
  { label: "Purple", text: "#784bd1", highlight: "#efe7ff" },
  { label: "Pink", text: "#d12f8b", highlight: "#fde8f4" },
];
