import { Extension, type Editor } from "@tiptap/core";

export type HistoryDirection = "undo" | "redo";

/**
 * Runs undo or redo without letting a failing history step escape. A
 * decoration plugin that maps its old decorations through the step can throw
 * a `RangeError` ("Position -1 outside of fragment") while the step is
 * applied. Left uncaught, that error leaves the key event unhandled and the
 * browser runs its own contenteditable undo, which rewrites the DOM behind
 * ProseMirror's back. Here the failed step is dropped instead, the document
 * stays exactly as it was, and the key still counts as handled.
 */
export const runHistoryCommand = (editor: Editor, direction: HistoryDirection): boolean => {
  if (editor.isDestroyed) return false;
  try {
    const chain = editor.chain().focus();
    return (direction === "undo" ? chain.undo() : chain.redo()).run();
  } catch (error) {
    console.warn(`[rich text] The ${direction} step could not be applied and was skipped.`, error);
    return true;
  }
};

/**
 * Takes over the undo and redo shortcuts from StarterKit's `undoRedo` keymap
 * (same chords, higher priority), running them through
 * {@link runHistoryCommand}. The toolbar buttons call the same helper.
 */
export const SafeHistory = Extension.create({
  name: "safeHistory",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => runHistoryCommand(this.editor, "undo"),
      "Shift-Mod-z": () => runHistoryCommand(this.editor, "redo"),
      "Mod-y": () => runHistoryCommand(this.editor, "redo"),
    };
  },
});
