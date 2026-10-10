import React from "react";
import {
  AiSummaryIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  InfoIcon,
  LockBadgeIcon,
  StarIcon,
  WorkspaceFolderIcon,
} from "@/icons/workspace-icons";
import CreatorAvatar from "./CreatorAvatar";
import Checkbox from "./Checkbox";
import type { ContentAsset, Creator, CreatorKey } from "./types";

export type ContentTableProps = {
  assets: ContentAsset[];
  creators: Record<CreatorKey, Creator>;
  /** Ids of the currently selected rows. */
  selected_ids: Set<string>;
  /** Toggle selection for a single row. */
  onToggleRow: (id: string) => void;
  /** Toggle selection for every visible row (select all / clear). */
  onToggleAll: (select_all: boolean) => void;
  /** Open an asset (e.g. navigate to its board). When omitted, clicking a row toggles selection instead. */
  onOpenAsset?: (id: string) => void;
  /** Copy shown when there are no rows (e.g. after a search). */
  empty_title?: string;
  empty_hint?: string;
};

/** Type icon for an asset (board vs. document), with an optional lock badge. */
const AssetTypeIcon: React.FC<{ asset: ContentAsset }> = ({ asset }) => (
  <span className="relative flex flex-none text-shell-text-secondary">
    {asset.type === "doc" ? <FileIcon size={16} /> : <FolderIcon size={16} />}
    {asset.is_locked && (
      <span className="absolute -bottom-[3px] -right-1 flex h-[10px] w-[10px] items-center justify-center rounded-[3px] bg-shell-panel text-shell-text-secondary">
        <LockBadgeIcon />
      </span>
    )}
  </span>
);

/** "97th Floor Development > 97th Dev": every ancestor folder with its own icon, chevrons in between. */
const FolderBreadcrumb: React.FC<{ asset: ContentAsset }> = ({ asset }) => {
  const crumbs = asset.folder_path ?? [asset.folder, asset.sub_folder].filter((crumb): crumb is string => Boolean(crumb));
  if (crumbs.length === 0) return null;

  return (
    <span className="flex min-w-0 items-center gap-1.5" title={crumbs.join(" / ")}>
      {crumbs.map((crumb, index) => (
        <React.Fragment key={`${crumb}-${index}`}>
          {index > 0 && (
            <span className="flex flex-none text-shell-text-faint">
              <ChevronRightIcon size={11} />
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex flex-none text-shell-text-secondary">
              <WorkspaceFolderIcon />
            </span>
            <span className="min-w-0 truncate">{crumb}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

/**
 * Spreadsheet style table of workspace assets, styled after monday.com's
 * workspace Content tab: a bordered card whose header stays pinned while the
 * rows scroll inside it. Every row shares the `workspace-manage-content-grid`
 * template (see `workspace-manage.css`) so header and cells line up, and the
 * card scrolls sideways on narrow screens instead of squashing the columns.
 */
const ContentTable: React.FC<ContentTableProps> = ({
  assets,
  creators,
  selected_ids,
  onToggleRow,
  onToggleAll,
  onOpenAsset,
  empty_title = "No assets match your filters",
  empty_hint = "Try a different search or clear the filters.",
}) => {
  const selected_count = assets.reduce(
    (total, asset) => (selected_ids.has(asset.id) ? total + 1 : total),
    0
  );
  const all_selected = assets.length > 0 && selected_count === assets.length;
  const some_selected = selected_count > 0 && !all_selected;

  return (
    <div className="overflow-hidden rounded-lg border border-shell-border bg-shell-panel">
      <div className="workspace-manage-content-scroll max-h-[max(360px,calc(100dvh-470px))] overflow-auto">
        {/* Header */}
        <div
          role="row"
          className="workspace-manage-content-grid sticky top-0 z-10 h-10 border-b border-shell-border bg-shell-panel text-[14px] font-medium text-shell-text"
        >
          <div className="flex justify-center">
            <Checkbox
              variant="monday"
              checked={all_selected}
              indeterminate={some_selected}
              onChange={(checked) => onToggleAll(checked)}
              aria_label="Select all assets"
            />
          </div>
          <div className="pl-0.5">Asset name</div>
          <div className="flex items-center gap-1">
            AI summary
            <span className="flex text-shell-text-secondary" title="Generate a short AI summary of the asset">
              <InfoIcon size={12} />
            </span>
          </div>
          <div>Creator</div>
          <div>Creation date</div>
          <div>Last modified</div>
          <div className="pr-4">Folder</div>
        </div>

        {/* Rows */}
        {assets.map((asset) => {
          const creator = creators[asset.creator];
          const is_selected = selected_ids.has(asset.id);
          return (
            <div
              key={asset.id}
              role="row"
              aria-selected={is_selected}
              onClick={() => (onOpenAsset ? onOpenAsset(asset.id) : onToggleRow(asset.id))}
              className={`workspace-manage-content-grid h-10 cursor-pointer border-b border-[var(--color-workspace-manage-grid)] text-[14px] text-shell-text transition-colors last:border-b-0 ${
                is_selected ? "bg-[var(--color-workspace-manage-selected)]" : "hover:bg-shell-hover"
              }`}
            >
              <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  variant="monday"
                  checked={is_selected}
                  onChange={() => onToggleRow(asset.id)}
                  aria_label={`Select ${asset.name}`}
                />
              </div>

              <div className="flex min-w-0 items-center gap-2 pr-4">
                <AssetTypeIcon asset={asset} />
                <span className="truncate text-[15px]">{asset.name}</span>
                {asset.is_favorite && (
                  <span className="flex flex-none text-[#ffcb00]">
                    <StarIcon filled size={16} />
                  </span>
                )}
              </div>

              <div className="flex w-[84px] justify-center">
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-shell-text-secondary transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
                  aria-label={`Generate AI summary for ${asset.name}`}
                >
                  <AiSummaryIcon size={18} />
                </button>
              </div>

              <div className="flex items-center">
                {creator && (
                  <CreatorAvatar
                    initials={creator.initials}
                    gradient_from={creator.gradient_from}
                    gradient_to={creator.gradient_to}
                    photo_url={creator.photo_url}
                    title={creator.name}
                    size={26}
                  />
                )}
              </div>

              <div className="truncate">{asset.created_date}</div>
              <div className="truncate">{asset.modified_date}</div>

              <div className="flex min-w-0 items-center pr-4 text-shell-text-secondary">
                <FolderBreadcrumb asset={asset} />
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="px-5 py-[54px] text-center">
            <div className="text-[15px] font-medium text-shell-text">{empty_title}</div>
            <div className="mt-1.5 text-[14px] text-shell-text-secondary">{empty_hint}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentTable;
