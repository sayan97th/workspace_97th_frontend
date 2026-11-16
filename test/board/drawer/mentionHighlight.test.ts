import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { findNamedMentions, MentionHighlight, refreshMentionHighlight } from "@/components/board/drawer/mentionHighlight";

const names = ["Amanda Carter", "Allen Bailey", "Everyone"];

describe("findNamedMentions", () => {
  it("only matches exact names with nothing glued after them", () => {
    const text = "ping @Amanda Carter, @Amandaaa Carterssss, @Amanda Carters and @Allen Bailey.";
    expect(findNamedMentions(text, names).map((mention) => mention.name)).toEqual(["Amanda Carter", "Allen Bailey"]);
  });

  it("is case sensitive and ignores an @ inside a word", () => {
    expect(findNamedMentions("@amanda carter mail x@Amanda Carter", names)).toEqual([]);
  });

  it("reports the range of each mention", () => {
    expect(findNamedMentions("hi @Everyone!", names)).toEqual([{ name: "Everyone", start: 3, end: 12 }]);
  });
});

describe("MentionHighlight", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const highlighted = (current: Editor) =>
    Array.from(current.view.dom.querySelectorAll(".rich-text-mention")).map((element) => element.textContent);

  it("colors exact names only and drops the color once the name is edited", () => {
    let roster = names;
    const current = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, MentionHighlight.configure({ getNames: () => roster })],
      content: "<p>hi @Amanda Carter and @Zorro Quinn</p>",
    });
    editor = current;
    expect(highlighted(current)).toEqual(["@Amanda Carter"]);

    // Typing one more letter at the end of the name: no longer anybody.
    const end = current.getText().indexOf(" and") + 1;
    current.commands.insertContentAt(end, "s");
    expect(current.getText()).toContain("@Amanda Carters and");
    expect(highlighted(current)).toEqual([]);

    // A roster that changes later recolors without an edit.
    current.commands.setContent("<p>hi @Zorro Quinn</p>");
    expect(highlighted(current)).toEqual([]);
    roster = [...names, "Zorro Quinn"];
    current.view.dispatch(refreshMentionHighlight(current.state.tr));
    expect(highlighted(current)).toEqual(["@Zorro Quinn"]);
  });
});
