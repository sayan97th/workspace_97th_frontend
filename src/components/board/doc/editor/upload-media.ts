import type { Editor, JSONContent } from "@tiptap/core";
import type { DocUploadedFile } from "@/types/board-doc";

/** Uploads one file embedded in a doc, resolving to where it is served from. */
export type DocUploadHandler = (file: File) => Promise<DocUploadedFile>;

/** Which block a file becomes. */
export type DocMediaKind = "image" | "video" | "audio" | "file";

/** What the media dialog was opened for: a file kind, or a web bookmark (link only). */
export type DocMediaRequest = DocMediaKind | "bookmark";

export const mediaKindForFile = (file: File): DocMediaKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const createUploadId = (): string => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** The block inserted for a file, pointing at `src` (a temporary blob URL while uploading). */
const buildMediaNode = (kind: DocMediaKind, file: Pick<File, "name" | "size" | "type">, src: string, upload_id: string | null): JSONContent => {
  switch (kind) {
    case "image":
      return { type: "image", attrs: { src, alt: file.name, upload_id } };
    case "video":
      return { type: "videoBlock", attrs: { src, upload_id } };
    case "audio":
      return { type: "audioBlock", attrs: { src, name: file.name, upload_id } };
    default:
      return { type: "fileBlock", attrs: { url: src, name: file.name, size: file.size, mime_type: file.type, upload_id } };
  }
};

/** Finds the position of the block still carrying `upload_id`, null once it was deleted. */
const findUploadPosition = (editor: Editor, upload_id: string): number | null => {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.attrs?.upload_id === upload_id) found = pos;
    return true;
  });
  return found;
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Inserts each file as its block right away (previewed from a blob URL) and
 * swaps in the uploaded URL once the upload finishes, so the writer never
 * waits on the network. Without an upload handler images fall back to an
 * inline data URL and other files are skipped. A failed upload removes its
 * block again and reports through `onError`.
 */
export const insertFiles = (
  editor: Editor,
  files: File[],
  onUploadFile: DocUploadHandler | undefined,
  onError: (message: string) => void,
  position?: number
) => {
  let insert_at = position;

  files.forEach((file) => {
    const kind = mediaKindForFile(file);

    if (!onUploadFile) {
      if (kind !== "image") {
        onError(`"${file.name}" can't be added here.`);
        return;
      }
      void readAsDataUrl(file).then((data_url) => {
        editor.chain().focus().insertContent(buildMediaNode(kind, file, data_url, null)).run();
      });
      return;
    }

    const upload_id = createUploadId();
    const preview_url = URL.createObjectURL(file);
    const node = buildMediaNode(kind, file, preview_url, upload_id);
    const chain = editor.chain().focus();
    if (insert_at !== undefined) chain.insertContentAt(insert_at, node);
    else chain.insertContent(node);
    chain.run();
    insert_at = undefined;

    onUploadFile(file)
      .then((uploaded) => {
        const pos = findUploadPosition(editor, upload_id);
        if (pos === null) return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        const source_key = kind === "file" ? "url" : "src";
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, [source_key]: uploaded.url, upload_id: null })
        );
      })
      .catch(() => {
        const pos = findUploadPosition(editor, upload_id);
        if (pos !== null) {
          const current = editor.state.doc.nodeAt(pos);
          if (current) editor.view.dispatch(editor.state.tr.delete(pos, pos + current.nodeSize));
        }
        onError(`We couldn't upload "${file.name}".`);
      })
      .finally(() => URL.revokeObjectURL(preview_url));
  });
};

/** Inserts a block from a link typed in the media dialog (no upload). */
export const insertMediaFromUrl = (editor: Editor, kind: DocMediaRequest, url: string) => {
  const name = url.split("/").pop()?.split("?")[0] || url;
  const node: JSONContent =
    kind === "bookmark"
      ? { type: "bookmark", attrs: { url } }
      : buildMediaNode(kind, { name, size: 0, type: "" }, url, null);
  editor.chain().focus().insertContent(node).run();
};
