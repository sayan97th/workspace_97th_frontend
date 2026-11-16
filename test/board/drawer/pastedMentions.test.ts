import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  findMentionAtPositions,
  findTextMentions,
  hasMentionText,
  PastedMentions,
} from "@/components/board/drawer/pastedMentions";

// jsdom has no ClipboardEvent, which ProseMirror's `pasteHTML` and `pasteText` build their synthetic event with.
if (typeof globalThis.ClipboardEvent === "undefined") {
  class ClipboardEventStub extends Event {
    clipboardData: DataTransfer | null = null;
  }
  (globalThis as unknown as { ClipboardEvent: typeof ClipboardEventStub }).ClipboardEvent = ClipboardEventStub;
}

const person = (id: string, name: string, extra: Partial<BoardPersonOption> = {}): BoardPersonOption => ({
  id,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  avatar_seed: 0,
  ...extra,
});

const people = [
  person("1", "Kevin Smith"),
  person("2", "Abby Allan"),
  person("3", "Abby Brown"),
  person("4", "Ernesto Afane"),
  person("5", "José Pérez"),
  person("6", "Gone User", { is_deactivated: true }),
];

const names = (text: string) => findTextMentions(text, people).map((mention) => mention.person.name);

describe("findTextMentions", () => {
  it("matches full names, case insensitive", () => {
    expect(names("Thanks @abby allan and @Kevin Smith!")).toEqual(["Abby Allan", "Kevin Smith"]);
  });

  it("matches a first name only one person on the board has", () => {
    expect(names("cc @Kevin, @Ernesto")).toEqual(["Kevin Smith", "Ernesto Afane"]);
  });

  it("skips a first name shared by two people", () => {
    expect(names("ping @Abby please")).toEqual([]);
  });

  it("never reads an email address or a longer word as a mention", () => {
    expect(names("mail kevin@example.com or @Kevinator")).toEqual([]);
  });

  it("handles accented names, non breaking spaces and Slack's zero width spaces", () => {
    expect(names("hola @José Pérez")).toEqual(["José Pérez"]);
    expect(names("hey​@Kevin")).toEqual(["Kevin Smith"]);
  });

  it("ignores deactivated people", () => {
    expect(names("@Gone User")).toEqual([]);
  });

  it("reports the matched range", () => {
    const [mention] = findTextMentions("hi @Kevin!", people);
    expect(mention).toMatchObject({ start: 3, end: 9 });
  });
});

describe("hasMentionText", () => {
  it("only counts whole names", () => {
    expect(hasMentionText("hi @Kevin Smith.", "Kevin Smith")).toBe(true);
    expect(hasMentionText("hi @Kevin Smithers", "Kevin Smith")).toBe(false);
    expect(hasMentionText("hi Kevin Smith", "Kevin Smith")).toBe(false);
  });
});

describe("PastedMentions extension", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const createEditor = (onMentions: (tagged: BoardPersonOption[]) => void) => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, Markdown, PastedMentions.configure({ getPeople: () => people, onMentions })],
      content: "",
    });
    return editor;
  };

  it("tags people named in pasted Slack HTML and strips the link around the mention", async () => {
    const onMentions = vi.fn();
    const current = createEditor(onMentions);

    current.view.pasteHTML(
      '<meta charset="utf-8"><span>Hey <a href="https://acme.slack.com/team/U1">@Kevin</a>, can you check with <b>@Abby Allan</b>?</span>'
    );
    await Promise.resolve();

    expect(current.getText()).toBe("Hey @Kevin Smith, can you check with @Abby Allan?");
    expect(current.getMarkdown()).not.toContain("](");
    expect(onMentions).toHaveBeenCalledTimes(1);
    expect(onMentions.mock.calls[0][0].map((tagged: BoardPersonOption) => tagged.id)).toEqual(["1", "2"]);
  });

  it("tags people in pasted plain text", async () => {
    const onMentions = vi.fn();
    const current = createEditor(onMentions);

    current.view.pasteText("@ernesto take a look");
    await Promise.resolve();

    expect(current.getText()).toBe("@Ernesto Afane take a look");
    expect(onMentions.mock.calls[0][0].map((tagged: BoardPersonOption) => tagged.id)).toEqual(["4"]);
  });

  it("leaves a paste without known names untouched", async () => {
    const onMentions = vi.fn();
    const current = createEditor(onMentions);

    current.view.pasteText("talk to @Someone Else");
    await Promise.resolve();

    expect(current.getText()).toBe("talk to @Someone Else");
    expect(onMentions).not.toHaveBeenCalled();
  });

  it("finds the @ of every mention so a tag can be removed", async () => {
    const current = createEditor(() => {});
    current.view.pasteText("@Kevin and @Kevin Smith again");
    await Promise.resolve();

    const positions = findMentionAtPositions(current.state.doc, "Kevin Smith");
    expect(positions).toHaveLength(2);
    current.commands.command(({ tr }) => {
      [...positions].reverse().forEach((position) => tr.delete(position, position + 1));
      return true;
    });
    expect(current.getText()).toBe("Kevin Smith and Kevin Smith again");
  });
});
