"use client";
import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Globe, Trash2 } from "lucide-react";
import { hostnameOf, isSafeUrl } from "./media-urls";

/** Web bookmark block: a card with the site's domain and the full link. */
const BookmarkView: React.FC<NodeViewProps> = ({ node, selected, editor, deleteNode }) => {
  const { url } = node.attrs;
  const safe_url = isSafeUrl(url) ? url : null;

  return (
    <NodeViewWrapper className={`doc-card doc-bookmark${selected ? " is-selected" : ""}`}>
      <div className="doc-card-row">
        <span className="doc-card-icon">
          <Globe size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {safe_url ? (
            <a href={safe_url} target="_blank" rel="noopener noreferrer" className="doc-card-title doc-card-link">
              {hostnameOf(safe_url)}
            </a>
          ) : (
            <span className="doc-card-title">Invalid link</span>
          )}
          <span className="doc-card-meta truncate">{url}</span>
        </span>
        {editor.isEditable && (
          <button type="button" className="doc-card-action" aria-label="Delete" title="Delete" onClick={deleteNode}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default BookmarkView;
