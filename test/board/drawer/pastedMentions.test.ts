import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  editDistance,
  findMentionAtPositions,
  findTextMentions,
  getUnresolvedMentions,
  hasMentionText,
  PastedMentions,
  removeUnresolvedMentions,
  scanTextMentions,
  suggestPeople,
  type UnresolvedMention,
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

describe("scanTextMentions", () => {
  const outsiders = [person("9", "Allen Bailey")];
  const scan = (text: string) => scanTextMentions(text, people, outsiders);
  const suggestionNames = (issue: { kind: string; suggestions?: BoardPersonOption[] }) =>
    (issue.suggestions ?? []).map((suggestion) => suggestion.name);

  it("flags a misspelled name with the closest people as suggestions", () => {
    const { mentions, unresolved } = scan("thanks @Kevn and @Jose");
    expect(mentions).toEqual([]);
    expect(unresolved.map((entry) => entry.text)).toEqual(["@Kevn", "@Jose"]);
    expect(unresolved[0].issue.kind).toBe("unknown");
    expect(suggestionNames(unresolved[0].issue as { kind: string; suggestions: BoardPersonOption[] })).toEqual(["Kevin Smith"]);
    expect(suggestionNames(unresolved[1].issue as { kind: string; suggestions: BoardPersonOption[] })).toEqual(["José Pérez"]);
  });

  it("flags a two word typo over the whole name", () => {
    const { unresolved } = scan("cc @Abby Alan please");
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].text).toBe("@Abby Alan");
    expect(suggestionNames(unresolved[0].issue as { kind: string; suggestions: BoardPersonOption[] })[0]).toBe("Abby Allan");
  });

  it("asks which person when a first name is shared", () => {
    const { unresolved } = scan("ping @Abby please");
    expect(unresolved[0].issue.kind).toBe("ambiguous");
    expect(suggestionNames(unresolved[0].issue as { kind: string; suggestions: BoardPersonOption[] })).toEqual(["Abby Allan", "Abby Brown"]);
  });

  it("never tags a different person who only shares the first name", () => {
    const { mentions, unresolved } = scan("ask @Kevin Brown about it");
    expect(mentions).toEqual([]);
    expect(unresolved[0]).toMatchObject({ text: "@Kevin Brown", issue: { kind: "unknown" } });
  });

  it("still tags a unique first name followed by lowercase words", () => {
    expect(scan("@Kevin can you check").mentions.map((mention) => mention.person.name)).toEqual(["Kevin Smith"]);
  });

  it("flags someone in the workspace who is not on the board", () => {
    const { unresolved } = scan("loop in @Allen Bailey and @Allen");
    expect(unresolved.map((entry) => [entry.text, entry.issue.kind])).toEqual([
      ["@Allen Bailey", "outside"],
      ["@Allen", "outside"],
    ]);
  });

  it("leaves Slack's group mentions, emails and numbers alone", () => {
    expect(scan("@channel @here @everyone mail me@x.com at @5pm").unresolved).toEqual([]);
  });
});

describe("suggestPeople", () => {
  it("offers names the typed text starts, and close typos", () => {
    expect(suggestPeople("kev", people).map((suggestion) => suggestion.name)).toEqual(["Kevin Smith"]);
    expect(suggestPeople("ernsto", people).map((suggestion) => suggestion.name)).toEqual(["Ernesto Afane"]);
    expect(suggestPeople("zz", people)).toEqual([]);
  });

  it("counts a swap of two letters as one edit", () => {
    expect(editDistance("jhon", "john")).toBe(1);
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

  const createEditor = (
    onMentions: (tagged: BoardPersonOption[]) => void,
    onUnresolvedChange: (mentions: UnresolvedMention[]) => void = () => {}
  ) => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        StarterKit,
        Markdown,
        PastedMentions.configure({
          getPeople: () => people,
          getOutsidePeople: () => [person("9", "Allen Bailey")],
          onMentions,
          onUnresolvedChange,
        }),
      ],
      content: "",
    });
    return editor;
  };

  it("tracks misspelled pasted names, underlines them and forgets them once edited or fixed", async () => {
    const onUnresolvedChange = vi.fn();
    const current = createEditor(() => {}, onUnresolvedChange);

    current.view.pasteText("hey @Kevn and @Allen, also @Kevin");
    await Promise.resolve();

    expect(current.getText()).toBe("hey @Kevn and @Allen, also @Kevin Smith");
    const reported = onUnresolvedChange.mock.calls.at(-1)?.[0] as UnresolvedMention[];
    expect(reported.map((mention) => [mention.text, mention.issue.kind])).toEqual([
      ["@Kevn", "unknown"],
      ["@Allen", "outside"],
    ]);
    expect(current.view.dom.querySelectorAll(".rich-text-mention-unresolved")).toHaveLength(2);

    // Typing before the flagged names moves them, they stay tracked.
    current.commands.insertContentAt(1, "Oh ");
    expect(getUnresolvedMentions(current.state).map((mention) => current.state.doc.textBetween(mention.from, mention.to))).toEqual([
      "@Kevn",
      "@Allen",
    ]);

    // Editing a flagged name by hand means the writer took over.
    const kevn = getUnresolvedMentions(current.state)[0];
    current.commands.insertContentAt(kevn.to - 1, "i");
    expect(getUnresolvedMentions(current.state).map((mention) => mention.text)).toEqual(["@Allen"]);

    // Fixed or kept from the notice.
    const allen = getUnresolvedMentions(current.state)[0];
    current.commands.command(({ tr }) => {
      removeUnresolvedMentions(tr, [allen.id]);
      return true;
    });
    expect(getUnresolvedMentions(current.state)).toEqual([]);
    expect((onUnresolvedChange.mock.calls.at(-1)?.[0] as UnresolvedMention[]).length).toBe(0);
  });

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
