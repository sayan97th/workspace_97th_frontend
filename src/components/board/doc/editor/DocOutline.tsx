"use client";
import React from "react";
import { useEditorState } from "@tiptap/react";
import { useDocEditor } from "./DocEditorContext";
import type { DocHeading } from "./doc-content";

const sameHeadings = (a: DocHeading[], b: DocHeading[] | null): boolean =>
  !!b && a.length === b.length && a.every((heading, index) => heading.text === b[index].text && heading.level === b[index].level && heading.pos === b[index].pos);

/**
 * The doc's table of contents, every heading indented by level. A click
 * puts the caret in that heading and scrolls it into view.
 */
const DocOutline: React.FC = () => {
  const { editor } = useDocEditor();

  const headings_state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const found: DocHeading[] = [];
      current?.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          found.push({ id: `heading-${pos}`, level: node.attrs.level, text: node.textContent, pos });
          return false;
        }
        return true;
      });
      return found;
    },
    equalityFn: sameHeadings,
  });
  const headings = headings_state ?? [];

  const goTo = (heading: DocHeading) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(heading.pos + 1).run();
    const dom = editor.view.nodeDOM(heading.pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <nav className="doc-outline" aria-label="Doc outline">
      <div className="doc-outline-title">Outline</div>
      {headings.length === 0 ? (
        <p className="doc-outline-empty">Add headings to your doc and they will show up here.</p>
      ) : (
        <ul>
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                type="button"
                className="doc-outline-item"
                style={{ paddingLeft: 8 + (heading.level - 1) * 14 }}
                onClick={() => goTo(heading)}
              >
                {heading.text || `Heading ${heading.level}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};

export default DocOutline;
