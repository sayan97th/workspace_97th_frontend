import React from "react";
import {
  AiSummaryIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderPathIcon,
  InfoIcon,
  LockBadgeIcon,
  StarIcon,
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
  <span className="relative flex flex-none text-shell-text-faint">
    {asset.type === "doc" ? <FileIcon size={17} /> : <FolderIcon size={17} />}
    {asset.is_locked && (
      <span className="absolute -bottom-[3px] -right-1 flex h-[11px] w-[11px] items-center justify-center rounded-[3px] bg-shell-bg text-shell-text-muted">
        <LockBadgeIcon />
      </span>
    )}
  </span>
);

/**
 * Spreadsheet-style table of workspace assets. Column layout and styling follow
 * the approved Claude design. Reusable for any list of {@link ContentAsset}.
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
  <div className="overflow-hidden rounded-xl border border-[#e6e6e1] bg-white">
    {/* Header */}
    <div className="flex h-[46px] items-center border-b border-shell-border bg-shell-panel-alt px-[18px] text-[13px] font-semibold text-shell-text-faint">
      <div className="flex w-8 flex-none items-center">
        <Checkbox
          checked={all_selected}
          indeterminate={some_selected}
          onChange={(checked) => onToggleAll(checked)}
          aria_label="Select all assets"
        />
      </div>
      <div className="min-w-0 flex-1">Asset name</div>
      <div className="flex w-[110px] flex-none items-center gap-1.5">
        AI summary
        <span className="flex text-shell-text-faint">
          <InfoIcon />
        </span>
      </div>
      <div className="w-[130px] flex-none">Creator</div>
      <div className="w-[120px] flex-none">Creation date</div>
      <div className="w-[120px] flex-none">Last modified</div>
      <div className="w-[230px] flex-none">Folder</div>
    </div>

    {/* Rows */}
    {assets.map((asset) => {
      const creator = creators[asset.creator];
      const is_selected = selected_ids.has(asset.id);
      return (
        <div
          key={asset.id}
          onClick={() => (onOpenAsset ? onOpenAsset(asset.id) : onToggleRow(asset.id))}
          className={`flex h-[53px] cursor-pointer items-center border-b border-[#eeeee9] px-[18px] last:border-b-0 ${
            is_selected ? "bg-brand-25 hover:bg-brand-50" : "bg-shell-panel hover:bg-shell-hover"
          }`}
        >
          <div
            className="flex w-8 flex-none items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <Checkbox
              checked={is_selected}
              onChange={() => onToggleRow(asset.id)}
              aria_label={`Select ${asset.name}`}
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-[11px]">
            <AssetTypeIcon asset={asset} />
            <span className="truncate text-[14.5px] font-medium text-shell-text">
              {asset.name}
            </span>
            {asset.is_favorite && (
              <span className="flex flex-none text-sunset-200">
                <StarIcon filled size={15} />
              </span>
            )}
          </div>

          <div className="w-[110px] flex-none">
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-brand-500"
              aria-label={`Generate AI summary for ${asset.name}`}
            >
              <AiSummaryIcon />
            </button>
          </div>

          <div className="flex w-[130px] flex-none items-center">
            {creator && (
              <CreatorAvatar
                initials={creator.initials}
                gradient_from={creator.gradient_from}
                gradient_to={creator.gradient_to}
                title={creator.name}
              />
            )}
          </div>

          <div className="w-[120px] flex-none text-[13.5px] text-shell-text-secondary">
            {asset.created_date}
          </div>
          <div className="w-[120px] flex-none text-[13.5px] text-shell-text-secondary">
            {asset.modified_date}
          </div>

          <div className="flex w-[230px] flex-none items-center gap-1.5 text-[13.5px] text-shell-text-secondary">
            <span className="flex flex-none text-shell-text-muted">
              <FolderPathIcon />
            </span>
            <span className="truncate">{asset.folder}</span>
            {asset.sub_folder && (
              <>
                <span className="flex flex-none text-shell-text-faint">
                  <ChevronRightIcon size={12} />
                </span>
                <span className="truncate">{asset.sub_folder}</span>
              </>
            )}
          </div>
        </div>
      );
    })}

    {assets.length === 0 && (
      <div className="px-5 py-[54px] text-center">
        <div className="text-[14.5px] font-semibold text-shell-text">{empty_title}</div>
        <div className="mt-1.5 text-[13px] text-shell-text-faint">{empty_hint}</div>
      </div>
    )}
  </div>
  );
};

export default ContentTable;
