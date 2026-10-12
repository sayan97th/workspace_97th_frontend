import type { JSONContent } from "@tiptap/core";

/**
 * A stored doc body: the editor's JSON document (what the editor saves), or
 * markdown written by the previous Doc tab editor, which still loads.
 */
export type ParsedDocContent =
  | { kind: "json"; json: JSONContent }
  | { kind: "markdown"; markdown: string }
  | { kind: "empty" };

export const parseDocContent = (raw: string | null | undefined): ParsedDocContent => {
  const value = raw?.trim() ?? "";
  if (!value) return { kind: "empty" };
  if (value.startsWith("{")) {
    try {
      const json = JSON.parse(value) as JSONContent;
      if (json && json.type === "doc") return { kind: "json", json };
    } catch {
      // Not JSON after all, read it as markdown below.
    }
  }
  return { kind: "markdown", markdown: value };
};

export const serializeDocContent = (json: JSONContent): string => JSON.stringify(json);

/** The headings of a doc, for the outline panel. */
export type DocHeading = { id: string; level: number; text: string; pos: number };
