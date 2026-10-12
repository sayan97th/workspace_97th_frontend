"use client";
import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import ResizableMediaFrame from "./ResizableMediaFrame";
import { isSafeUrl, toEmbedUrl } from "./media-urls";

/** Video block: an embedded YouTube/Vimeo/Loom player or the browser's player for uploaded files. */
const VideoBlockView: React.FC<NodeViewProps> = ({ node, selected, editor, updateAttributes, deleteNode }) => {
  const { src, width_percent, align, upload_id } = node.attrs;
  const safe_src = isSafeUrl(src) ? src : null;
  const embed_url = safe_src ? toEmbedUrl(safe_src) : null;

  return (
    <NodeViewWrapper className="doc-block-video">
      <ResizableMediaFrame
        width_percent={width_percent}
        align={align}
        selected={selected}
        editable={editor.isEditable}
        onResize={(next) => updateAttributes({ width_percent: next })}
        onAlign={(next) => updateAttributes({ align: next })}
        onDelete={deleteNode}
      >
        {embed_url ? (
          <div className="doc-video-embed">
            {/* While editing, a transparent cover keeps clicks on the block (select, drag) instead of the player. */}
            <iframe
              src={embed_url}
              title="Embedded video"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {editor.isEditable && !selected && <span className="doc-video-cover" aria-hidden="true" />}
          </div>
        ) : safe_src ? (
          <video src={safe_src} controls preload="metadata" className="doc-video" />
        ) : (
          <div className="doc-media-empty">This video can&apos;t be shown.</div>
        )}
        {upload_id && (
          <div className="doc-media-uploading">
            <Loader2 size={18} className="animate-spin" /> Uploading…
          </div>
        )}
      </ResizableMediaFrame>
    </NodeViewWrapper>
  );
};

export default VideoBlockView;
