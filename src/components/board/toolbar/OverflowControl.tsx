"use client";
import React, { useRef, useState } from "react";
import {
  DownloadIcon,
  EditPencilIcon,
  HeaderHeightIcon,
  PaintBucketIcon,
  PinIcon,
  RowHeightIcon,
} from "@/icons/board-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardHeaderHeight, BoardRowHeight } from "../types";
import type { BoardToolbarApi, BoardToolbarExportOptions, BoardToolbarViewActions } from "./types";
import { exportVisibleRows, type BoardExportFormat } from "./exportBoardRows";
import PinColumnsControl from "./PinColumnsControl";
import ToolbarButton from "./ToolbarButton";

export type OverflowControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  export_options?: BoardToolbarExportOptions;
  view_actions?: BoardToolbarViewActions;
};

const EXPORT_FORMATS: { id: BoardExportFormat; label: string }[] = [
  { id: "xlsx", label: "Export to Excel" },
  { id: "csv", label: "Export to CSV" },
];

/** Shared by "Header height" and "Item height", like monday's toolbar menu. */
const HEIGHT_OPTIONS: { id: BoardHeaderHeight & BoardRowHeight; label: string; lines: 1 | 2 | 3 }[] = [
  { id: "single", label: "Single", lines: 1 },
  { id: "double", label: "Double", lines: 2 },
  { id: "triple", label: "Triple", lines: 3 },
];

/**
 * The toolbar's "..." button and its monday style menu (see `ActionMenu`): Pin columns, Header height and
 * Item height submenus that open to the left with the current preset filled light blue, Conditional coloring,
 * the disabled "Default item values" row and, when the board wires it, an Export submenu.
 */
function OverflowControl<TRow>({ toolbar, export_options, view_actions }: OverflowControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [exporting_format, setExportingFormat] = useState<BoardExportFormat | null>(null);
  const is_menu_open = toolbar.active_panel === "overflow";
  const is_pin_open = toolbar.active_panel === "pin";
  const is_color_open = toolbar.active_panel === "color";
  const pin_count = toolbar.pinned_column_ids.length;
  const color_rule_count = toolbar.conditional_color_rules.length;

  const runExport = async (export_format: BoardExportFormat) => {
    if (!export_options?.is_ready || exporting_format) return;
    setExportingFormat(export_format);
    try {
      await exportVisibleRows(toolbar, export_options.board_name, export_format);
    } catch {
      export_options.onExportError?.("The export failed. Please try again.");
    } finally {
      setExportingFormat(null);
    }
  };

  const buildHeightItems = <TId extends string>(selected_id: TId, onPick: (id: TId) => void): ActionMenuItem[] =>
    HEIGHT_OPTIONS.map((option) => ({
      key: option.id,
      label: option.label,
      icon: <RowHeightIcon size={16} lines={option.lines} />,
      is_selected: selected_id === option.id,
      onClick: () => onPick(option.id as TId),
    }));

  const sections: ActionMenuSection[] = [
    {
      key: "display",
      items: [
        {
          key: "pin",
          label: "Pin columns",
          icon: <PinIcon size={16} />,
          meta: pin_count ? String(pin_count) : undefined,
          onClick: () => toolbar.openPanel("pin"),
        },
        {
          key: "header_height",
          label: "Header height",
          icon: <HeaderHeightIcon size={16} />,
          submenu: buildHeightItems(toolbar.header_height, toolbar.setHeaderHeight),
        },
        {
          key: "item_height",
          label: "Item height",
          icon: <RowHeightIcon size={16} lines={3} />,
          submenu: buildHeightItems(toolbar.row_height, toolbar.setRowHeight),
        },
        {
          key: "color",
          label: "Conditional coloring",
          icon: <PaintBucketIcon size={16} />,
          meta: color_rule_count ? String(color_rule_count) : undefined,
          onClick: () => toolbar.openPanel("color"),
        },
        {
          key: "default_values",
          label: "Default item values",
          icon: <EditPencilIcon size={16} />,
          disabled: true,
          disabled_reason: "Default item values are not available yet",
        },
      ],
    },
    {
      key: "export",
      items: export_options
        ? [
            {
              key: "export",
              label: exporting_format ? "Exporting..." : "Export",
              icon: <DownloadIcon size={16} />,
              meta: export_options.is_ready ? `${toolbar.visible_row_count} ${toolbar.visible_row_count === 1 ? "item" : "items"}` : undefined,
              disabled: !export_options.is_ready || exporting_format !== null,
              disabled_reason: exporting_format ? "Export in progress" : "Loading every item...",
              submenu: EXPORT_FORMATS.map((export_format) => ({
                key: export_format.id,
                label: export_format.label,
                onClick: () => void runExport(export_format.id),
              })),
            },
          ]
        : [],
    },
  ];

  return (
    <>
      <Tooltip content="More options" className="flex">
        <ToolbarButton
          ref={button_ref}
          label=""
          aria_label="More toolbar actions"
          Icon={MoreDotsIcon}
          variant="accent"
          is_open={is_menu_open || is_pin_open || is_color_open}
          onClick={() => {
            if (!is_menu_open) export_options?.onPrepare();
            toolbar.togglePanel("overflow");
          }}
        />
      </Tooltip>

      <ActionMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={toolbar.closePanel}
        sections={sections}
        aria_label="More toolbar actions"
        width={256}
        submenu_width={200}
        align="end"
        submenu_side="left"
        class_name="action-menu--selectable"
      />

      <PinColumnsControl toolbar={toolbar} anchor_el={button_ref.current} is_open={is_pin_open} view_actions={view_actions} />
    </>
  );
}

export default OverflowControl;
