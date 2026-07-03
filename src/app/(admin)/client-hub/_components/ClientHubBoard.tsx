"use client";
import React from "react";
import {
  BoardShell,
  BoardTable,
  OverflowBadge,
  ProductTag,
  StatusPill,
  TeamAvatars,
  type BoardColumn,
} from "@/components/board";
import { RowChatIcon } from "@/components/board/board-icons";
import { ChevronRightIcon, StarIcon } from "@/layout/workspace-icons";
import {
  CLIENT_HUB_COLUMNS,
  CLIENT_HUB_GROUPS,
  CLIENT_HUB_VIEWS,
  CLIENT_STATUS,
  type ClientRow,
} from "../_data/client-hub-data";

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
const ClientHubBoard: React.FC = () => (
  <BoardShell
    header={{ title: "Client Hub", is_favorite: true, invite_count: 18 }}
    tabs={{ primary_label: "Main table", views: CLIENT_HUB_VIEWS }}
  >
    <BoardTable<ClientRow>
      columns={CLIENT_HUB_COLUMNS}
      groups={CLIENT_HUB_GROUPS}
      getRowId={(row) => row.id}
      renderCell={renderClientCell}
    />
  </BoardShell>
);

export default ClientHubBoard;
