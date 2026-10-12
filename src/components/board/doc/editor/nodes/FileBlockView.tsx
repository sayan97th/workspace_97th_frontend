"use client";
import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Download, Loader2, Paperclip, Trash2 } from "lucide-react";
import { formatFileSize, isSafeUrl } from "./media-urls";

/** File block: a card with the file's name and size that opens or downloads it. */
const FileBlockView: React.FC<NodeViewProps> = ({ node, selected, editor, deleteNode }) => {
  const { url, name, size, upload_id } = node.attrs;
  const safe_url = isSafeUrl(url) && !upload_id ? url : null;

  return (
    <NodeViewWrapper className={`doc-card doc-file${selected ? " is-selected" : ""}`}>
      <div className="doc-card-row">
        <span className="doc-card-icon">
          <Paperclip size={16} />
        </span>
        {safe_url ? (
          <a href={safe_url} target="_blank" rel="noopener noreferrer" className="doc-card-title doc-card-link">
            {name || "File"}
          </a>
        ) : (
          <span className="doc-card-title">{name || "File"}</span>
        )}
        <span className="doc-card-meta">{upload_id ? "Uploading…" : formatFileSize(size)}</span>
        {upload_id && <Loader2 size={15} className="animate-spin text-[var(--doc-text-faint)]" />}
        {safe_url && (
          <a href={safe_url} download={name ?? true} className="doc-card-action" aria-label="Download" title="Download">
            <Download size={14} />
          </a>
        )}
        {editor.isEditable && (
          <button type="button" className="doc-card-action" aria-label="Delete" title="Delete" onClick={deleteNode}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default FileBlockView;
