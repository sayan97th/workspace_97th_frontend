"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  closeImageDialog$,
  imageDialogState$,
  imageUploadHandler$,
  saveImage$,
  useCellValues,
  usePublisher,
} from "@mdxeditor/editor";
import { CloseIcon, ImageIcon } from "@/icons/board-icons";
import { UploadIcon } from "@/icons/workspace-icons";

/**
 * Replaces `@mdxeditor/editor`'s built-in "Insert image" dialog (wired in via
 * `imagePlugin({ ImageDialog: BoardDocImageDialog })`). The stock version is a
 * plain Radix `Dialog` portaled into the editor's own popup container — styled
 * entirely by `@mdxeditor/editor/style.css`'s own design tokens rather than
 * this app's, and rendered outside the app's own modal stacking convention.
 * This reads the same public `imageDialogState$`/`saveImage$` cells the
 * built-in dialog uses — so upload (via the `imageUploadHandler` passed to
 * `imagePlugin`) and URL-based insertion both keep working — but renders as a
 * centered modal in the app's own style, matching `ConfirmActionModal`, and
 * portals straight to `document.body`.
 *
 * Declared as a plain zero-argument function (not `React.FC`, which requires
 * a `props` parameter) to match `imagePlugin`'s
 * `ImageDialog?: () => JSX.Element` override signature — cast at the call
 * site in `BoardDocEditor.tsx` since this, like the built-in dialog it
 * replaces, legitimately returns `null` while closed.
 */
const BoardDocImageDialog = () => {
  const [dialog_state, image_upload_handler] = useCellValues(imageDialogState$, imageUploadHandler$);
  const saveImage = usePublisher(saveImage$);
  const closeImageDialog = usePublisher(closeImageDialog$);

  const [src_value, setSrcValue] = useState("");
  const [alt_value, setAltValue] = useState("");
  const [title_value, setTitleValue] = useState("");
  const [chosen_file_name, setChosenFileName] = useState<string | null>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);

  const is_open = dialog_state.type !== "inactive";
  const is_editing = dialog_state.type === "editing";

  useEffect(() => {
    if (!is_open) return;
    if (dialog_state.type === "editing") {
      setSrcValue(dialog_state.initialValues.src ?? "");
      setAltValue(dialog_state.initialValues.altText ?? "");
      setTitleValue(dialog_state.initialValues.title ?? "");
    } else {
      setSrcValue("");
      setAltValue("");
      setTitleValue("");
    }
    if (file_input_ref.current) file_input_ref.current.value = "";
    setChosenFileName(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, dialog_state.type]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImageDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, closeImageDialog]);

  if (!is_open || typeof document === "undefined") return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const files = file_input_ref.current?.files;
    if (files && files.length > 0) {
      saveImage({ file: files, altText: alt_value.trim(), title: title_value.trim() });
    } else if (src_value.trim()) {
      saveImage({ src: src_value.trim(), altText: alt_value.trim(), title: title_value.trim() });
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Insert image" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={() => closeImageDialog()} aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
        className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/[0.14] text-brand-200">
              <ImageIcon size={14} />
            </span>
            <span className="text-base font-semibold tracking-[-0.01em]">{is_editing ? "Edit image" : "Insert image"}</span>
          </div>
          <button
            type="button"
            onClick={() => closeImageDialog()}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-[22px] py-5">
          {image_upload_handler !== null && (
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-shell-text-muted">Upload from your device</label>
              <button
                type="button"
                onClick={() => file_input_ref.current?.click()}
                className="flex items-center gap-2 rounded-[8px] border border-dashed border-shell-border px-3 py-2.5 text-left text-[13px] text-shell-text-secondary transition-colors hover:border-brand-400 hover:bg-shell-hover hover:text-shell-text"
              >
                <UploadIcon size={14} />
                <span>{chosen_file_name ?? "Choose an image…"}</span>
              </button>
              <input
                ref={file_input_ref}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                aria-label="Choose an image"
                className="hidden"
                onChange={(event) => setChosenFileName(event.target.files?.[0]?.name ?? null)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="board-doc-image-src" className="text-[11.5px] font-semibold text-shell-text-muted">
              {image_upload_handler !== null ? "Or add an image from a URL" : "Image URL"}
            </label>
            <input
              id="board-doc-image-src"
              type="text"
              value={src_value}
              onChange={(event) => setSrcValue(event.target.value)}
              placeholder="https://…"
              className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="board-doc-image-alt" className="text-[11.5px] font-semibold text-shell-text-muted">
              Alt text
            </label>
            <input
              id="board-doc-image-alt"
              type="text"
              value={alt_value}
              onChange={(event) => setAltValue(event.target.value)}
              className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="board-doc-image-title" className="text-[11.5px] font-semibold text-shell-text-muted">
              Title
            </label>
            <input
              id="board-doc-image-title"
              type="text"
              value={title_value}
              onChange={(event) => setTitleValue(event.target.value)}
              className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={() => closeImageDialog()}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default BoardDocImageDialog;
