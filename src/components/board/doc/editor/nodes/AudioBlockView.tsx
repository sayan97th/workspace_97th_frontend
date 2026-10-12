"use client";
import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Music, Trash2 } from "lucide-react";
import { isSafeUrl } from "./media-urls";

/** Audio block: the clip's name above the browser's audio player. */
const AudioBlockView: React.FC<NodeViewProps> = ({ node, selected, editor, deleteNode }) => {
  const { src, name, upload_id } = node.attrs;
  const safe_src = isSafeUrl(src) ? src : null;

  return (
    <NodeViewWrapper className={`doc-card doc-audio${selected ? " is-selected" : ""}`}>
      <div className="doc-card-row">
        <span className="doc-card-icon">
          <Music size={16} />
        </span>
        <span className="doc-card-title">{name || "Audio"}</span>
        {upload_id && <Loader2 size={15} className="animate-spin text-[var(--doc-text-faint)]" />}
        {editor.isEditable && (
          <button type="button" className="doc-card-action" aria-label="Delete" title="Delete" onClick={deleteNode}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {safe_src && <audio src={safe_src} controls preload="metadata" className="doc-audio-player" />}
    </NodeViewWrapper>
  );
};

export default AudioBlockView;
