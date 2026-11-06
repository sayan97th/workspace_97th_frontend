"use client";
import React, { useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardImportSourceColumn } from "@/types/board-import";
import { ChevronDownIcon, EyeOffIcon, ImportColumnIcon, ResetIcon } from "./importIcons";

export type ImportRemovedColumnsProps = {
  /** The file columns left out of the import, in file order. */
  sources: BoardImportSourceColumn[];
  onRestore: (source: BoardImportSourceColumn) => void;
  onRestoreAll: () => void;
};

/**
 * The "Not imported" tray under the "Map columns" rows: every file column
 * removed from the import, as a compact chip with a restore button. Removing
 * a row moves it here instead of leaving an empty picker in the list, so the
 * list only shows what will actually be imported.
 */
const ImportRemovedColumns: React.FC<ImportRemovedColumnsProps> = ({ sources, onRestore, onRestoreAll }) => {
  const [is_open, setIsOpen] = useState(true);
  if (sources.length === 0) return null;

  return (
    <section className="iw-removed" aria-label="Columns not imported">
      <div className="iw-removed-head">
        <button type="button" className="iw-removed-toggle" aria-expanded={is_open} onClick={() => setIsOpen((current) => !current)}>
          <ChevronDownIcon size={14} className="iw-removed-chevron" />
          <EyeOffIcon size={14} />
          Not imported
          <span className="iw-removed-count">{sources.length}</span>
        </button>
        {sources.length > 1 && (
          <button type="button" className="iw-link" onClick={onRestoreAll}>
            Restore all
          </button>
        )}
      </div>

      {is_open && (
        <ul className="iw-removed-list">
          {sources.map((source) => (
            <li key={source.index} className="iw-removed-chip">
              <ImportColumnIcon type={source.suggested_type} size={16} />
              <span className="iw-removed-label" title={source.label}>
                {source.label}
              </span>
              {source.filled_count === 0 && <span className="iw-removed-meta">Empty</span>}
              <PortalTooltip content={`Import ${source.label} again`}>
                <button type="button" className="iw-removed-restore" aria-label={`Restore ${source.label}`} onClick={() => onRestore(source)}>
                  <ResetIcon size={13} />
                </button>
              </PortalTooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ImportRemovedColumns;
