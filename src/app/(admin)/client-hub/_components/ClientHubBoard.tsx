"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BoardItemDrawer,
  BoardShell,
  BoardTable,
  BoardToolbar,
  OverflowBadge,
  ProductTag,
  StatusPill,
  TeamAvatars,
  useBoardItemDrawer,
  useBoardToolbar,
  type BoardColumn,
  type BoardItemDrawerConfig,
  type BoardToolbarConfig,
} from "@/components/board";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { boardContentService } from "@/services/board-content.service";
import { RowChatIcon } from "@/icons/board-icons";
import { ChevronRightIcon, StarIcon } from "@/icons/workspace-icons";
import {
  CLIENT_HUB_BOARD_INFO,
  CLIENT_HUB_COLUMNS,
  CLIENT_HUB_CURRENT_USER,
  CLIENT_HUB_GROUP_BY_OPTIONS,
  CLIENT_HUB_GROUPS,
  CLIENT_HUB_MENTIONABLE_PEOPLE,
  CLIENT_HUB_QUICK_FILTER_FACETS,
  CLIENT_HUB_SORT_OPTIONS,
  CLIENT_HUB_TEAM_ROSTER,
  CLIENT_STATUS,
  getClientColumnText,
  getClientHubActivityLog,
  getClientHubInfoBoxes,
  getClientHubInitialComments,
  type ClientRow,
} from "@/data/client-hub-data";
import type { BoardViewDto } from "@/types/board-content";

/** Renders one Client Hub cell for the given column. */
const renderClientCell = (row: ClientRow, column: BoardColumn): React.ReactNode => {
  switch (column.id) {
    case "item":
      return (
        <div className="flex w-full items-center gap-[7px]">
          {row.sub_items_count ? (
            <span className="flex flex-none text-shell-text-faint">
              <ChevronRightIcon size={11} />
            </span>
          ) : null}
          <span className="min-w-0 truncate text-[13.5px] font-medium text-shell-text">
            {row.name}
          </span>
          {row.has_star ? (
            <span className="flex flex-none text-sunset-200">
              <StarIcon filled size={14} />
            </span>
          ) : null}
          <span className="flex-1" />
          {row.sub_items_count ? (
            <span className="flex-none rounded-[5px] bg-shell-hover px-1.5 py-px text-[11px] font-semibold text-shell-text-muted">
              {row.sub_items_count}
            </span>
          ) : null}
        </div>
      );

    case "chat":
      return (
        <span className="flex items-center gap-[3px] text-[11px] font-semibold text-shell-text-muted">
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
        <span className="w-full truncate text-[12.5px] text-shell-text-secondary">{row.kpi}</span>
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
        <div className="h-full w-full bg-shell-panel-alt" />
      );

    case "start":
      return row.start ? (
        <span className="text-[12.5px] text-shell-text-secondary">{row.start}</span>
      ) : null;

    case "end":
      return row.end ? (
        <span className="text-[12.5px] text-shell-text-secondary">{row.end}</span>
      ) : null;

    default:
      return null;
  }
};

/**
 * The Client Hub board view. Composes the reusable board shell + table with the
 * Client Hub column schema, seed data and cell renderers. The table itself
 * stays frontend mock data by design, but its tabs are real: this resolves
 * Client Hub's board id (it renders at the static `/client-hub` route, so it
 * never gets one from routing) and loads its saved views before mounting the
 * interactive board body.
 */
const ClientHubBoard: React.FC = () => {
  const search_params = useSearchParams();
  const initial_active_view_id = Number(search_params.get("view")) || null;

  const [board_id, setBoardId] = useState<number | null>(null);
  const [initial_views, setInitialViews] = useState<BoardViewDto[] | null>(null);
  const [initial_personal_order, setInitialPersonalOrder] = useState<number[] | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    boardContentService
      .getClientHubBoardId()
      .then((id) => boardContentService.getViews(id).then((views) => ({ id, views })))
      .then(({ id, views }) => {
        if (cancelled) return;
        setBoardId(id);
        setInitialViews(views.views);
        setInitialPersonalOrder(views.personal_order);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load Client Hub. Please try again." />
    );
  }

  if (board_id === null || initial_views === null) {
    return (
      <BoardShell
        header={{ title: "Client Hub", is_favorite: true, invite_count: 18, info: CLIENT_HUB_BOARD_INFO }}
        tabs={{ primary_label: "Main table", views: [] }}
      >
        <BoardLoadingSpinner />
      </BoardShell>
    );
  }

  return (
    <ClientHubBoardBody
      board_id={board_id}
      initial_views={initial_views}
      initial_active_view_id={initial_active_view_id}
      initial_personal_order={initial_personal_order}
    />
  );
};

export default ClientHubBoard;

// ─────────────────────────────────────────────────────────────────────────────

type ClientHubBoardBodyProps = {
  board_id: number;
  initial_views: BoardViewDto[];
  initial_active_view_id: number | null;
  initial_personal_order: number[] | null;
};

/**
 * Mounted only once Client Hub's board id and saved views have resolved, so
 * `useBoardViewTabs`'s tab-switch effect has real views to replay from its
 * very first render.
 */
const ClientHubBoardBody: React.FC<ClientHubBoardBodyProps> = ({
  board_id,
  initial_views,
  initial_active_view_id,
  initial_personal_order,
}) => {
  const router = useRouter();

  /** Deep-link URL for a tab: the static Client Hub route, with a `?view=` query param for non-primary tabs. */
  const buildViewUrl = (view: BoardViewDto): string => (view.is_primary ? "/client-hub" : `/client-hub?view=${view.id}`);

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

  const view_tabs = useBoardViewTabs({
    board_id,
    initial_views,
    initial_active_view_id,
    initial_personal_order,
    toolbar,
    onViewActivated: (view) => router.replace(buildViewUrl(view)),
  });

  const drawer_config: BoardItemDrawerConfig<ClientRow> = useMemo(
    () => ({
      getRowId: (row) => row.id,
      getRowTitle: (row) => row.name,
      eyebrow_label: "Client Hub · Item",
      current_user: CLIENT_HUB_CURRENT_USER,
      mentionable_people: CLIENT_HUB_MENTIONABLE_PEOPLE,
      getInitialComments: getClientHubInitialComments,
      getInfoBoxes: getClientHubInfoBoxes,
      getActivityLog: getClientHubActivityLog,
    }),
    []
  );

  const drawer = useBoardItemDrawer(drawer_config);

  return (
    <BoardShell
      header={{
        title: "Client Hub",
        is_favorite: true,
        invite_count: 18,
        info: CLIENT_HUB_BOARD_INFO,
      }}
      tabs={{
        tabs: view_tabs.tabs,
        active_view_id: view_tabs.active_view_id,
        onSelectView: view_tabs.selectView,
        onAddView: () => view_tabs.addView(),
        onRenameView: (id, label) => view_tabs.renameView(Number(id), label),
        onChangeIcon: (id, icon) => view_tabs.changeViewIcon(Number(id), icon),
        onDeleteView: (id) => view_tabs.deleteView(Number(id)),
        onPinView: (id) => view_tabs.pinView(Number(id)),
        onDuplicateView: (id) => view_tabs.duplicateView(Number(id)),
        onLockView: (id) => view_tabs.lockView(Number(id)),
        getViewUrl: (tab) => (tab.id === view_tabs.tabs[0]?.id ? "/client-hub" : `/client-hub?view=${tab.id}`),
        onReorderPersonalTabs: (ordered_ids) => view_tabs.reorderPersonalTabs(ordered_ids),
      }}
      toolbar={<BoardToolbar toolbar={toolbar} />}
    >
      {view_tabs.is_dirty && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={view_tabs.saveActiveView}
            className="rounded-[7px] bg-brand-500 px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Save changes to &ldquo;{view_tabs.active_view?.label}&rdquo;
          </button>
        </div>
      )}

      <BoardTable<ClientRow>
        columns={toolbar.visible_columns}
        groups={toolbar.groups}
        getRowId={(row) => row.id}
        renderCell={renderClientCell}
        rowHeight={toolbar.row_height}
        pinnedColumnIds={toolbar.pinned_column_ids}
        rowColors={toolbar.row_colors}
        cellColors={toolbar.cell_colors}
        onRowClick={drawer.openRow}
        selectedRowId={drawer.open_row_id}
      />
      <BoardItemDrawer drawer={drawer} />
    </BoardShell>
  );
};
