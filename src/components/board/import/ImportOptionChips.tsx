"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardImportDeclaredOption } from "@/types/board-import";

export type ImportOptionChipsProps = {
  options: BoardImportDeclaredOption[];
  /** How many chips are shown before "+N", the rest are listed in the tooltip. */
  limit?: number;
  /** Status labels are filled blocks, dropdown options are outlined pills, like on the board. */
  variant: "status" | "dropdown";
};

/**
 * The options a spreadsheet dropdown list offers, shown the way the new
 * column will show them: colored Status labels or Dropdown pills. Hovering
 * the "+N" lists every option.
 */
const ImportOptionChips: React.FC<ImportOptionChipsProps> = ({ options, limit = 4, variant }) => {
  const visible = options.slice(0, limit);
  const hidden = options.slice(limit);

  return (
    <span className="iw-options" data-variant={variant}>
      {visible.map((option) => (
        <span key={option.label} className="iw-option-chip" style={{ "--iw-option-color": option.color } as React.CSSProperties} title={option.label}>
          {option.label}
        </span>
      ))}
      {hidden.length > 0 && (
        <PortalTooltip content={hidden.map((option) => option.label).join(", ")}>
          <span className="iw-option-more" tabIndex={0}>
            +{hidden.length}
          </span>
        </PortalTooltip>
      )}
    </span>
  );
};

export default ImportOptionChips;
