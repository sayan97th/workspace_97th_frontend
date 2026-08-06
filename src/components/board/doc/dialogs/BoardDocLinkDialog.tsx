"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  activeEditor$,
  cancelLinkEdit$,
  linkDialogState$,
  onWindowChange$,
  removeLink$,
  showLinkTitleField$,
  switchFromPreviewToLinkEdit$,
  updateLink$,
  useCellValues,
  usePublisher,
} from "@mdxeditor/editor";
import { EditPencilIcon, LinkIcon } from "@/icons/board-icons";
import { DeleteIcon } from "@/icons/workspace-icons";

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;
const DIALOG_WIDTH = 320;

type LinkEditFormProps = {
  url: string;
  title: string;
  text: string;
  showTitleField: boolean;
  showTextField: boolean;
  onSubmit: (values: { url: string; title: string; text: string }) => void;
  onCancel: () => void;
};

/** Uncontrolled local form, remounted (via a `key` on the caller) whenever a different link is opened — mirrors the app's other inline forms (e.g. `AddCardInput`) rather than pulling in `react-hook-form`. */
const LinkEditForm: React.FC<LinkEditFormProps> = ({ url, title, text, showTitleField, showTextField, onSubmit, onCancel }) => {
  const [url_value, setUrlValue] = useState(url);
  const [title_value, setTitleValue] = useState(title);
  const [text_value, setTextValue] = useState(text);
  const url_input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    url_input_ref.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ url: url_value.trim(), title: title_value.trim(), text: text_value.trim() });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2.5 p-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="board-doc-link-url" className="text-[11.5px] font-semibold text-shell-text-muted">
          URL
        </label>
        <input
          ref={url_input_ref}
          id="board-doc-link-url"
          type="text"
          value={url_value}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="Paste or type a URL"
          className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
        />
      </div>

      {showTextField && (
        <div className="flex flex-col gap-1">
          <label htmlFor="board-doc-link-text" className="text-[11.5px] font-semibold text-shell-text-muted">
            Anchor text
          </label>
          <input
            id="board-doc-link-text"
            type="text"
            value={text_value}
            onChange={(event) => setTextValue(event.target.value)}
            className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
          />
        </div>
      )}

      {showTitleField && (
        <div className="flex flex-col gap-1">
          <label htmlFor="board-doc-link-title" className="text-[11.5px] font-semibold text-shell-text-muted">
            Link title
          </label>
          <input
            id="board-doc-link-title"
            type="text"
            value={title_value}
            onChange={(event) => setTitleValue(event.target.value)}
            className="w-full rounded-[7px] border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-[7px] bg-brand-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Save
        </button>
      </div>
    </form>
  );
};

/**
 * Replaces `@mdxeditor/editor`'s built-in link popover (wired in via
 * `linkDialogPlugin({ LinkDialog: BoardDocLinkDialog })`). The stock
 * Radix-Popover version anchors its own collision/flip math to the selection
 * rectangle's DOM ancestors, which the admin shell's `overflow-hidden` +
 * `position: relative` panels throw off badly enough to render the dialog
 * clipped against the sidebar. This reads the same public reactive cells the
 * built-in dialog uses (so link editing/preview/remove all still work), but
 * positions itself with the same real-viewport-clamped math as the board
 * toolbar's `BoardPopover`, portaled straight to `document.body` — sidestepping
 * the ancestor's layout entirely instead of fighting it.
 *
 * Declared as a plain zero-argument function (not `React.FC`, which requires
 * a `props` parameter) to match `linkDialogPlugin`'s
 * `LinkDialog?: () => JSX.Element` override signature — cast at the call site
 * in `BoardDocEditor.tsx` since this, like the built-in dialog it replaces,
 * legitimately returns `null` while closed.
 */
function BoardDocLinkDialog() {
  const [link_dialog_state, show_title_field, active_editor] = useCellValues(linkDialogState$, showLinkTitleField$, activeEditor$);
  const publishWindowChange = usePublisher(onWindowChange$);
  const updateLink = usePublisher(updateLink$);
  const cancelLinkEdit = usePublisher(cancelLinkEdit$);
  const switchToEdit = usePublisher(switchFromPreviewToLinkEdit$);
  const removeLink = usePublisher(removeLink$);

  const dialog_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const is_open = link_dialog_state.type !== "inactive";
  const rectangle = link_dialog_state.type !== "inactive" ? link_dialog_state.rectangle : null;

  // Keeps the anchor rectangle fresh across scroll/resize — the plugin
  // recomputes `linkDialogState$.rectangle` off this signal the same way the
  // stock dialog does, so a scrolled page doesn't leave the dialog behind.
  useEffect(() => {
    if (!is_open) return;
    const update = () => {
      active_editor?.getEditorState().read(() => publishWindowChange(true));
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [is_open, active_editor, publishWindowChange]);

  useLayoutEffect(() => {
    if (!is_open || !rectangle) {
      setPosition(null);
      return;
    }

    const dialog_height = dialog_ref.current?.offsetHeight ?? 0;
    let top = rectangle.top + rectangle.height + ANCHOR_GAP;
    if (top + dialog_height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rectangle.top - dialog_height - ANCHOR_GAP);
    }

    let left = rectangle.left;
    left = Math.min(left, window.innerWidth - DIALOG_WIDTH - VIEWPORT_MARGIN);
    left = Math.max(left, VIEWPORT_MARGIN);

    setPosition({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, rectangle?.top, rectangle?.left, rectangle?.width, rectangle?.height]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialog_ref}
      className="fixed z-[1000] rounded-xl border border-shell-border bg-shell-panel text-shell-text shadow-2xl shadow-black/40"
      style={{
        width: DIALOG_WIDTH,
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {link_dialog_state.type === "edit" && (
        <LinkEditForm
          url={link_dialog_state.url}
          title={link_dialog_state.title}
          text={link_dialog_state.text}
          showTitleField={show_title_field}
          showTextField={link_dialog_state.withAnchorText}
          onSubmit={updateLink}
          onCancel={() => cancelLinkEdit()}
          key={link_dialog_state.linkNodeKey}
        />
      )}

      {link_dialog_state.type === "preview" && (
        <div className="flex items-center gap-1 p-1.5">
          <a
            href={link_dialog_state.href ?? "about:blank"}
            target={link_dialog_state.url.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            title={link_dialog_state.url}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[13px] text-brand-500 hover:bg-shell-hover"
          >
            <LinkIcon size={13} className="flex-none" />
            <span className="truncate">{link_dialog_state.url}</span>
          </a>
          <button
            type="button"
            onClick={() => switchToEdit()}
            title="Edit link"
            aria-label="Edit link"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <EditPencilIcon size={13} />
          </button>
          <button
            type="button"
            onClick={() => removeLink()}
            title="Remove link"
            aria-label="Remove link"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <DeleteIcon size={13} />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};

export default BoardDocLinkDialog;
