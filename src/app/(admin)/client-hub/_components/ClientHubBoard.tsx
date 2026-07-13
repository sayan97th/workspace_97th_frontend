"use client";
import React, { useMemo } from "react";
import {
  BoardShell,
  BoardTable,
  BoardToolbar,
  OverflowBadge,
  ProductTag,
  StatusPill,
  TeamAvatars,
  useBoardToolbar,
  type BoardColumn,
  type BoardToolbarConfig,
} from "@/components/board";
import { RowChatIcon } from "@/icons/board-icons";
import { ChevronRightIcon, StarIcon } from "@/icons/workspace-icons";
import {
  CLIENT_HUB_COLUMNS,
  CLIENT_HUB_GROUP_BY_OPTIONS,
  CLIENT_HUB_GROUPS,
  CLIENT_HUB_QUICK_FILTER_FACETS,
  CLIENT_HUB_SORT_OPTIONS,
  CLIENT_HUB_TEAM_ROSTER,
  CLIENT_HUB_VIEWS,
  CLIENT_STATUS,
  getClientColumnText,
  type ClientRow,
} from "@/data/client-hub-data";

/** Renders one Client Hub cell for the given column. */
const renderClientCell = (row: ClientRow, column: BoardColumn): React.ReactNode => {
  switch (column.id) {
    case "item":
      return (
        <div className="flex w-full items-center gap-[7px]">
          {row.sub_items_count ? (
            <span className="flex flex-none text-[#7e8889]">
              <ChevronRightIcon size={11} />
            </span>
          ) : null}
          <span className="min-w-0 truncate text-[13.5px] font-medium text-[#e4e9e9]">
            {row.name}
          </span>
          {row.has_star ? (
            <span className="flex flex-none text-sunset-200">
              <StarIcon filled size={14} />
            </span>
          ) : null}
          <span className="flex-1" />
          {row.sub_items_count ? (
            <span className="flex-none rounded-[5px] bg-white/[0.06] px-1.5 py-px text-[11px] font-semibold text-[#9aa4a5]">
              {row.sub_items_count}
            </span>
          ) : null}
        </div>
      );

    case "chat":
      return (
        <span className="flex items-center gap-[3px] text-[11px] font-semibold text-[#8a9495]">
          <RowChatIcon />
          {row.chat_count}
        </span>
      );

    case "client":
      return row.client_tag ? (
        <span className="font-mono-accent text-xs text-[#8fb4c9]">{row.client_tag}</span>
      ) : null;

    case "team":
      return (
        <TeamAvatars count={row.team_count} extra={row.team_extra} seed={row.team_seed} />
      );

    case "products":
      return (
        <div className="flex flex-wrap items-center gap-1">
          {row.products.map((product, index) => (
            <ProductTag key={`${product}-${index}`} label={product} />
          ))}
          {row.product_extra ? <OverflowBadge label={`+${row.product_extra}`} /> : null}
        </div>
      );

    case "kpi":
      return row.kpi ? (
        <span className="w-full truncate text-[12.5px] text-[#b4bcbd]">{row.kpi}</span>
      ) : null;

    case "status": {
      const status = CLIENT_STATUS[row.status];
      return <StatusPill label={status.label} bg={status.bg} color={status.color} />;
    }

    case "partner":
      return row.has_partner ? (
        <div className="flex h-full w-full items-center justify-center bg-[#a358df] text-[12.5px] font-semibold text-white">
          Referral
        </div>
      ) : (
        <div className="h-full w-full bg-[#101f1e]" />
      );

    case "start":
      return row.start ? (
        <span className="text-[12.5px] text-[#b4bcbd]">{row.start}</span>
      ) : null;

    case "end":
      return row.end ? (
        <span className="text-[12.5px] text-[#b4bcbd]">{row.end}</span>
      ) : null;

    default:
      return null;
  }
};

/**
 * The Client Hub board view. Composes the reusable board shell + table with the
 * Client Hub column schema, seed data and cell renderers.
 */
const ClientHubBoard: React.FC = () => {
  const toolbar_config: BoardToolbarConfig<ClientRow> = useMemo(
    () => ({
      columns: CLIENT_HUB_COLUMNS,
      default_groups: CLIENT_HUB_GROUPS,
      getRowId: (row) => row.id,
      getColumnText: getClientColumnText,
      persons: CLIENT_HUB_TEAM_ROSTER,
      getPersonIds: (row) => row.assigned_person_ids,
      sort_options: CLIENT_HUB_SORT_OPTIONS,
      group_by_options: CLIENT_HUB_GROUP_BY_OPTIONS,
      quick_filter_facets: CLIENT_HUB_QUICK_FILTER_FACETS,
    }),
    []
  );

  const toolbar = useBoardToolbar(toolbar_config);

  return (
    <BoardShell
      header={{ title: "Client Hub", is_favorite: true, invite_count: 18 }}
      tabs={{ primary_label: "Main table", views: CLIENT_HUB_VIEWS }}
      toolbar={<BoardToolbar toolbar={toolbar} />}
    >
      <BoardTable<ClientRow>
        columns={toolbar.visible_columns}
        groups={toolbar.groups}
        getRowId={(row) => row.id}
        renderCell={renderClientCell}
        rowHeight={toolbar.row_height}
      />
    </BoardShell>
  );
};

export default ClientHubBoard;
