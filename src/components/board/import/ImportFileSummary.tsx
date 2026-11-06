"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardImportSourceColumn } from "@/types/board-import";
import { FlagIcon, ImageIcon, ImportItemNameIcon, ListIcon } from "./importIcons";

export type ImportFileSummaryProps = {
  source_columns: BoardImportSourceColumn[];
  /** The file column feeding the item name, null while none is picked. */
  name_source: BoardImportSourceColumn | null;
};

type Insight = { key: string; icon: React.ReactNode; label: string; detail: string };

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * A strip of "what we found in your file" chips above the mapping card: the
 * column naming the items, embedded pictures and documents, dropdown lists
 * and priorities. Each chip's tooltip names the columns involved, so the
 * import's less visible parts can be checked at a glance.
 */
const ImportFileSummary: React.FC<ImportFileSummaryProps> = ({ source_columns, name_source }) => {
  const asset_columns = source_columns.filter((column) => column.assets !== null);
  const image_count = asset_columns.reduce((total, column) => total + (column.assets?.image_count ?? 0), 0);
  const file_count = asset_columns.reduce((total, column) => total + (column.assets?.file_count ?? 0), 0);
  const list_columns = source_columns.filter((column) => column.declared_options.length > 0);
  const priority_columns = source_columns.filter((column) => column.option_preset === "priority");
  const labels = (columns: BoardImportSourceColumn[]) => columns.map((column) => `"${column.label}"`).join(", ");

  const insights: Insight[] = [];

  if (name_source) {
    insights.push({
      key: "name",
      icon: <ImportItemNameIcon size={14} />,
      label: `Items named by "${name_source.label}"`,
      detail: "Each row's item name comes from this column. Change it in the Item row below.",
    });
  }
  if (file_count > 0) {
    const documents = file_count - image_count;
    insights.push({
      key: "assets",
      icon: <ImageIcon size={14} />,
      label: [image_count > 0 ? plural(image_count, "image") : null, documents > 0 ? plural(documents, "file") : null].filter(Boolean).join(", "),
      detail: `Embedded in ${labels(asset_columns)}. They are uploaded into a Files column.`,
    });
  }
  if (list_columns.length > 0) {
    insights.push({
      key: "lists",
      icon: <ListIcon size={14} />,
      label: plural(list_columns.length, "dropdown list"),
      detail: `${labels(list_columns)} pick from dropdown lists. Every option of each list is kept.`,
    });
  }
  if (priority_columns.length > 0) {
    insights.push({
      key: "priority",
      icon: <FlagIcon size={14} />,
      label: priority_columns.length === 1 ? "Priority column" : plural(priority_columns.length, "priority column"),
      detail: `${labels(priority_columns)} use the board's Priority colors.`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <ul className="iw-insights" aria-label="Found in this file">
      {insights.map((insight) => (
        <li key={insight.key}>
          <PortalTooltip content={insight.detail}>
            <span className="iw-insight" tabIndex={0} data-kind={insight.key}>
              {insight.icon}
              <span className="iw-insight-label">{insight.label}</span>
            </span>
          </PortalTooltip>
        </li>
      ))}
    </ul>
  );
};

export default ImportFileSummary;
