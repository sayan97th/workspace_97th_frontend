import { describe, expect, it } from "vitest";
import { getPastedMarkdown, looksLikeMarkdown } from "@/components/board/drawer/markdown/markdownPaste";

/** A minimal clipboard holding the given types, enough for `getData`. */
const clipboardWith = (data: Record<string, string>): DataTransfer =>
  ({ getData: (type: string) => data[type] ?? "" }) as unknown as DataTransfer;

describe("looksLikeMarkdown", () => {
  it.each([
    ["# Weekly notes", "title"],
    ["Plan:\n- first\n- second", "bullets"],
    ["1. Ship\n2. Measure", "numbered list"],
    ["> Quoted text", "quote"],
    ["```ts\nconst a = 1;\n```", "code fence"],
    ["| Name | Owner |\n| --- | --- |\n| Deck | Ana |", "table"],
    ["This is **important**", "bold"],
    ["Ping *later* today", "italic"],
    ["Run `pnpm test` first", "inline code"],
    ["See [the spec](https://example.com)", "link"],
    ["Old ~~price~~ here", "strikethrough"],
  ])("detects %j (%s)", (text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it.each([
    ["Just a normal sentence, nothing else."],
    ["2 * 3 * 4 = 24"],
    ["snake_case_name and other_name"],
    ["Price is 5-10 dollars"],
    ["   "],
  ])("leaves plain text alone: %j", (text) => {
    expect(looksLikeMarkdown(text)).toBe(false);
  });
});

describe("getPastedMarkdown", () => {
  it("returns Markdown plain text with normalized line breaks", () => {
    expect(getPastedMarkdown(clipboardWith({ "text/plain": "- one\r\n- two" }))).toBe("- one\n- two");
  });

  it("keeps the editor's own paste when the clipboard carries formatted HTML", () => {
    const clipboard = clipboardWith({ "text/plain": "**bold**", "text/html": "<p><strong>bold</strong></p>" });
    expect(getPastedMarkdown(clipboard)).toBeNull();
  });

  it("still converts text copied from a code editor, whose HTML is only styled spans", () => {
    const clipboard = clipboardWith({
      "text/plain": "## Steps\n- run",
      "text/html": '<div style="color: #ccc"><div><span style="color: #569cd6">## Steps</span></div></div>',
    });
    expect(getPastedMarkdown(clipboard)).toBe("## Steps\n- run");
  });

  it("ignores text without Markdown and an empty clipboard", () => {
    expect(getPastedMarkdown(clipboardWith({ "text/plain": "hello there" }))).toBeNull();
    expect(getPastedMarkdown(null)).toBeNull();
  });
});
