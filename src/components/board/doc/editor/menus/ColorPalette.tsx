"use client";
import React from "react";
import type { Editor } from "@tiptap/core";
import { DOC_COLORS } from "./color-options";

/** Text color and highlight swatches, each row with a "Default" that clears it. */
const ColorPalette: React.FC<{ editor: Editor; onPicked?: () => void }> = ({ editor, onPicked }) => {
  const pick = (run: () => void) => {
    run();
    onPicked?.();
  };

  return (
    <div className="doc-color-palette">
      <div className="doc-popover-label">Text color</div>
      <div className="doc-color-grid">
        <button
          type="button"
          className="doc-color-swatch"
          title="Default"
          aria-label="Default text color"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pick(() => editor.chain().focus().unsetColor().run())}
        >
          A
        </button>
        {DOC_COLORS.map((color) => (
          <button
            key={color.label}
            type="button"
            className={`doc-color-swatch${editor.isActive("textStyle", { color: color.text }) ? " is-active" : ""}`}
            style={{ color: color.text }}
            title={color.label}
            aria-label={`${color.label} text`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(() => editor.chain().focus().setColor(color.text).run())}
          >
            A
          </button>
        ))}
      </div>
      <div className="doc-popover-label">Highlight</div>
      <div className="doc-color-grid">
        <button
          type="button"
          className="doc-color-swatch is-clear"
          title="No highlight"
          aria-label="No highlight"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pick(() => editor.chain().focus().unsetHighlight().run())}
        />
        {DOC_COLORS.map((color) => (
          <button
            key={color.label}
            type="button"
            className={`doc-color-swatch${editor.isActive("highlight", { color: color.highlight }) ? " is-active" : ""}`}
            style={{ background: color.highlight }}
            title={color.label}
            aria-label={`${color.label} highlight`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(() => editor.chain().focus().setHighlight({ color: color.highlight }).run())}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;
