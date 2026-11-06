"use client";
import React, { useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardImportAssetPreview, BoardImportAssetSummary } from "@/types/board-import";
import { FileIcon, ImageIcon } from "./importIcons";

/** "1.2 MB", "84 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** "PDF", "PNG", from the file name, for a document's thumbnail. */
function extensionLabel(file_name: string): string {
  const extension = file_name.split(".").pop() ?? "";
  return extension.length > 0 && extension.length <= 4 ? extension.toUpperCase() : "FILE";
}

/** One thumbnail. An image falls back to its glyph when it can't be loaded. */
const AssetThumb: React.FC<{ asset: BoardImportAssetPreview }> = ({ asset }) => {
  const [has_failed, setHasFailed] = useState(false);
  const can_show_image = asset.kind === "image" && asset.url && !has_failed;

  const preview = (
    <span className="iw-asset-peek">
      {can_show_image ? (
        // A staged upload preview, not a page asset: next/image would need the API host configured.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.url ?? undefined} alt="" className="iw-asset-peek-image" />
      ) : (
        <span className="iw-asset-peek-file">
          <FileIcon size={28} />
        </span>
      )}
      <span className="iw-asset-peek-name">{asset.file_name}</span>
      {asset.width && asset.height ? (
        <span className="iw-asset-peek-meta">
          {asset.width} × {asset.height}
        </span>
      ) : null}
    </span>
  );

  return (
    <PortalTooltip content={preview}>
      <span className="iw-asset-thumb" tabIndex={0} aria-label={asset.file_name} data-kind={asset.kind}>
        {can_show_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url ?? undefined} alt="" loading="lazy" onError={() => setHasFailed(true)} />
        ) : asset.kind === "image" ? (
          <ImageIcon size={14} />
        ) : (
          <span className="iw-asset-thumb-ext">{extensionLabel(asset.file_name)}</span>
        )}
      </span>
    </PortalTooltip>
  );
};

/**
 * The pictures and documents embedded in a file column, as a row of small
 * thumbnails with a "+N" for the rest. Hovering or focusing one shows it
 * larger, so the column can be recognized before importing.
 */
const ImportAssetStrip: React.FC<{ assets: BoardImportAssetSummary }> = ({ assets }) => {
  const hidden_count = assets.file_count - assets.previews.length;
  const documents = assets.file_count - assets.image_count;
  const summary = [
    assets.image_count > 0 ? `${assets.image_count} image${assets.image_count === 1 ? "" : "s"}` : null,
    documents > 0 ? `${documents} file${documents === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <span className="iw-assets">
      <span className="iw-asset-strip">
        {assets.previews.map((asset, index) => (
          <AssetThumb key={`${asset.file_name}-${index}`} asset={asset} />
        ))}
        {hidden_count > 0 && <span className="iw-asset-more">+{hidden_count}</span>}
      </span>
      <span className="iw-row-meta">
        {summary} embedded · {formatBytes(assets.total_bytes)}
      </span>
    </span>
  );
};

export default ImportAssetStrip;
