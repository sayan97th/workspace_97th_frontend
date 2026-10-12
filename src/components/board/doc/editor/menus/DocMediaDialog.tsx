"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, X } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { normalizeUrl, isSafeUrl } from "../nodes/media-urls";
import { insertMediaFromUrl, type DocMediaRequest } from "../upload-media";

type DocMediaDialogProps = {
  editor: Editor | null;
  kind: DocMediaRequest | null;
  can_upload: boolean;
  onClose: () => void;
  onFiles: (files: File[]) => void;
};

type Tab = "upload" | "link";

const COPY: Record<DocMediaRequest, { title: string; accept: string; link_label: string; link_hint: string }> = {
  image: { title: "Add an image", accept: "image/*", link_label: "Image link", link_hint: "Works with any image on the web." },
  video: { title: "Add a video", accept: "video/*", link_label: "Video link", link_hint: "Works with YouTube, Vimeo, Loom and direct video links." },
  audio: { title: "Add audio", accept: "audio/*", link_label: "Audio link", link_hint: "Works with direct links to audio files." },
  file: { title: "Add a file", accept: "", link_label: "File link", link_hint: "Links to a file stored somewhere else." },
  bookmark: { title: "Add a web bookmark", accept: "", link_label: "Link", link_hint: "Shows the site as a card in the doc." },
};

/**
 * Dialog behind the Image, Video, Audio, File and Web bookmark blocks:
 * "Upload" (pick or drop files) or "Embed link". Inserts at the caret the
 * block was opened from. Bookmarks only take a link.
 */
const DocMediaDialog: React.FC<DocMediaDialogProps> = ({ editor, kind, can_upload, onClose, onFiles }) => {
  const [tab, setTab] = useState<Tab>("upload");
  const [link_value, setLinkValue] = useState("");
  const [link_error, setLinkError] = useState<string | null>(null);
  const [is_dragging_over, setIsDraggingOver] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);

  const allows_upload = can_upload && kind !== "bookmark";

  useEffect(() => {
    if (!kind) return;
    setTab(allows_upload ? "upload" : "link");
    setLinkValue("");
    setLinkError(null);
  }, [kind, allows_upload]);

  useEffect(() => {
    if (!kind) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [kind, onClose]);

  if (!kind || !editor || typeof document === "undefined") return null;
  const copy = COPY[kind];

  const handleFiles = (file_list: FileList | null) => {
    const files = Array.from(file_list ?? []);
    if (files.length === 0) return;
    onClose();
    onFiles(files);
  };

  const handleLinkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const url = normalizeUrl(link_value);
    if (!isSafeUrl(url)) {
      setLinkError("Enter a valid link that starts with http:// or https://");
      return;
    }
    onClose();
    insertMediaFromUrl(editor, kind, url);
  };

  return createPortal(
    <div className="doc-theme doc-dialog-overlay" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="doc-dialog-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="doc-dialog">
        <div className="doc-dialog-header">
          <h2 className="doc-dialog-title">{copy.title}</h2>
          <button type="button" className="doc-icon-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {allows_upload && (
          <div className="doc-dialog-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "upload"} className="doc-dialog-tab" onClick={() => setTab("upload")}>
              Upload
            </button>
            <button type="button" role="tab" aria-selected={tab === "link"} className="doc-dialog-tab" onClick={() => setTab("link")}>
              Embed link
            </button>
          </div>
        )}

        {tab === "upload" && allows_upload ? (
          <div className="doc-dialog-body">
            <button
              type="button"
              className={`doc-dropzone${is_dragging_over ? " is-over" : ""}`}
              onClick={() => file_input_ref.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingOver(false);
                handleFiles(event.dataTransfer.files);
              }}
            >
              <Upload size={22} />
              <span className="doc-dropzone-title">Choose a file or drag it here</span>
              <span className="doc-dropzone-hint">Up to 50 MB</span>
            </button>
            <input
              ref={file_input_ref}
              type="file"
              multiple={kind === "image" || kind === "file"}
              accept={copy.accept || undefined}
              className="hidden"
              aria-label="Choose a file"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        ) : (
          <form className="doc-dialog-body" onSubmit={handleLinkSubmit}>
            <label htmlFor="doc-media-link" className="doc-field-label">
              {copy.link_label}
            </label>
            <input
              id="doc-media-link"
              autoFocus
              type="text"
              value={link_value}
              onChange={(event) => {
                setLinkValue(event.target.value);
                setLinkError(null);
              }}
              placeholder="https://"
              className="doc-input is-large"
            />
            <p className={link_error ? "doc-field-error" : "doc-field-hint"}>{link_error ?? copy.link_hint}</p>
            <div className="doc-dialog-actions">
              <button type="button" className="doc-button is-tertiary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="doc-button is-primary" disabled={!link_value.trim()}>
                {kind === "bookmark" ? "Create bookmark" : "Embed"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DocMediaDialog;
