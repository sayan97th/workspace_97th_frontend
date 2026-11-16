import React, { forwardRef, useImperativeHandle, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import type { RichTextComposerProps, RichTextComposerRef } from "@/components/board/drawer/RichTextComposer";

/**
 * Tiptap needs a real layout engine, so the editor is replaced by a stand in
 * that keeps the latest props around: a test "types" by calling `onChange`
 * and `onMentionQueryChange` the way the editor does on every keystroke.
 */
const editor_state: { props: RichTextComposerProps | null } = { props: null };

vi.mock("@/components/board/drawer/RichTextComposer", () => {
  const FakeRichTextComposer = forwardRef<RichTextComposerRef, RichTextComposerProps>(function FakeRichTextComposer(props, ref) {
    editor_state.props = props;
    useImperativeHandle(ref, () => ({
      insertText: (text) => props.onChange(`${props.value}${text}`),
      insertMentionText: (name) => {
        editor_state.props?.onChange(editor_state.props.value.replace(/@\w*$/, `@${name} `));
        editor_state.props?.onMentionQueryChange?.(null);
      },
      untagMention: () => {},
      startMention: () => {
        editor_state.props?.onChange(`${editor_state.props.value} @`);
        editor_state.props?.onMentionQueryChange?.("");
      },
      mentionAtEnd: () => {},
      getTriggerAnchorRect: () => null,
      insertMarkdown: () => {},
      appendMarkdownBlock: () => {},
      insertItemReference: () => {},
      focus: () => {},
      isEmpty: () => props.value === "",
    }));
    return <div data-testid="editor">{props.value}</div>;
  });
  return { default: FakeRichTextComposer };
});

vi.mock("@/components/board/drawer/SavedRepliesMenu", () => ({ default: () => null }));
vi.mock("@/components/board/drawer/EmojiPalette", () => ({ default: () => null }));

const { default: CommentEditForm } = await import("@/components/board/drawer/CommentEditForm");

const person = (id: string, name: string, job_title?: string): BoardPersonOption => ({
  id,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  avatar_seed: Number(id),
  job_title,
});

const viewer = person("1", "Viewer Person");
const noa = person("2", "Noa", "Knowledge Base Writer");
const noy = person("3", "Noy");
const people = [viewer, noa, noy];

type HarnessProps = { initial_value: string; onSave: (ids: string[]) => void; existing_mention_ids?: string[] };

/** Holds the draft like the drawer hooks do, so the form sees every change it makes. */
const Harness: React.FC<HarnessProps> = ({ initial_value, onSave, existing_mention_ids }) => {
  const [value, setValue] = useState(initial_value);
  return (
    <CommentEditForm
      value={value}
      onChange={setValue}
      onSave={onSave}
      onCancel={() => {}}
      mentionable_people={people}
      current_user_id={viewer.id}
      existing_mention_ids={existing_mention_ids}
    />
  );
};

/** Types `text` at the end of the draft, reporting the `@query` before the caret like the editor. */
const typeText = (text: string) =>
  act(() => {
    const props = editor_state.props!;
    const next = `${props.value}${text}`;
    props.onChange(next);
    const match = /(?:^|\s)@(\w*)$/.exec(next);
    props.onMentionQueryChange?.(match ? match[1] : null);
  });

describe("CommentEditForm mentions", () => {
  test("typing @ while editing opens the people picker and filters it by name", () => {
    render(<Harness initial_value="Venue is closed" onSave={vi.fn()} />);

    typeText(" @no");

    const options = screen.getAllByRole("option").map((option) => option.querySelector(".mention-picker__label")?.textContent);
    expect(options).toEqual(["Noa (Knowledge Base Writer)", "Noy"]);
  });

  test("picking a person tags them and Save sends their id", async () => {
    const on_save = vi.fn();
    render(<Harness initial_value="Venue is closed" onSave={on_save} />);

    typeText(" @no");
    await userEvent.click(screen.getByRole("option", { name: /Noa \(Knowledge Base Writer\)/ }));

    expect(screen.getByTestId("editor")).toHaveTextContent("Venue is closed @Noa");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saving notifies Noa");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(on_save).toHaveBeenCalledWith(["2"]);
  });

  test("Enter picks the highlighted person instead of saving", () => {
    const on_save = vi.fn();
    render(<Harness initial_value="Hi" onSave={on_save} />);

    typeText(" @no");
    act(() => {
      editor_state.props!.onSuggestionKeyDown?.(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    });
    act(() => {
      editor_state.props!.onSuggestionKeyDown?.(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(screen.getByTestId("editor")).toHaveTextContent("Hi @Noy");
    expect(on_save).not.toHaveBeenCalled();
  });

  test("a mention typed away again tags nobody", async () => {
    const on_save = vi.fn();
    render(<Harness initial_value="Hi" onSave={on_save} />);

    typeText(" @no");
    await userEvent.click(screen.getByRole("option", { name: /Noy$/ }));
    act(() => editor_state.props!.onChange("Hi"));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(on_save).toHaveBeenCalledWith([]);
  });

  test("the notice leaves out people the update already mentioned", async () => {
    render(<Harness initial_value="Hi" onSave={vi.fn()} existing_mention_ids={["2"]} />);

    typeText(" @no");
    await userEvent.click(screen.getByRole("option", { name: /Noa \(Knowledge Base Writer\)/ }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("the @ button starts a mention at the caret", () => {
    render(<Harness initial_value="Hi" onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Mention someone" }));

    expect(screen.getByRole("listbox", { name: "Mention someone" })).toBeInTheDocument();
  });

  test("without a roster the form offers no mentions", () => {
    render(<CommentEditForm value="Hi" onChange={() => {}} onSave={() => {}} onCancel={() => {}} />);

    expect(screen.queryByRole("button", { name: "Mention someone" })).not.toBeInTheDocument();
    expect(editor_state.props?.can_mention).toBe(false);
  });
});
