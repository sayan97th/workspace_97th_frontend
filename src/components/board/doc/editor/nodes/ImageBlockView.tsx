"use client";
import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ExternalLink, Loader2 } from "lucide-react";
import ResizableMediaFrame, { MediaToolbarButton } from "./ResizableMediaFrame";
import { isSafeUrl } from "./media-urls";

/** Image block: resizable, alignable, with an "open original" action. */
const ImageBlockView: React.FC<NodeViewProps> = ({ node, selected, editor, updateAttributes, deleteNode }) => {
  const { src, alt, title, width_percent, align, upload_id } = node.attrs;
  const safe_src = isSafeUrl(src) ? src : null;

  return (
    <NodeViewWrapper className="doc-block-image">
      <ResizableMediaFrame
        width_percent={width_percent}
        align={align}
        selected={selected}
        editable={editor.isEditable}
        onResize={(next) => updateAttributes({ width_percent: next })}
        onAlign={(next) => updateAttributes({ align: next })}
        onDelete={deleteNode}
        actions={
          safe_src && !upload_id ? (
            <MediaToolbarButton label="Open original" onClick={() => window.open(safe_src, "_blank", "noopener,noreferrer")}>
              <ExternalLink size={15} />
            </MediaToolbarButton>
          ) : null
        }
      >
        {safe_src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safe_src} alt={alt ?? ""} title={title ?? undefined} draggable={false} className="doc-image" />
        ) : (
          <div className="doc-media-empty">This image can&apos;t be shown.</div>
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

export default ImageBlockView;
