import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export type FileDropPasteOptions = {
  /** Files dropped (with the drop position) or pasted (position null, at the caret). */
  onFiles: ((files: File[], position: number | null) => void) | null;
};

/** Hands files dropped onto or pasted into the doc to the upload flow instead of the browser. */
export const FileDropPaste = Extension.create<FileDropPasteOptions>({
  name: "fileDropPaste",

  addOptions() {
    return { onFiles: null };
  },

  addProseMirrorPlugins() {
    const { onFiles } = this.options;
    if (!onFiles) return [];

    return [
      new Plugin({
        key: new PluginKey("docFileDropPaste"),
        props: {
          handleDrop: (view, event, _slice, moved) => {
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (moved || files.length === 0) return false;
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            onFiles(files, coordinates?.pos ?? null);
            return true;
          },
          handlePaste: (_view, event) => {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (files.length === 0) return false;
            event.preventDefault();
            onFiles(files, null);
            return true;
          },
        },
      }),
    ];
  },
});
