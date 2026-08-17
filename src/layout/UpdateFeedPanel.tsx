"use client";
import React, { useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import SlideOverDrawer from "./SlideOverDrawer";
import UpdateFeedCard from "./UpdateFeedCard";
import { useFeedUpdates } from "@/hooks/useFeedUpdates";
import {
  BookmarkIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  CloseIcon,
  FeedSettingsIcon,
  MentionIcon,
} from "@/icons/workspace-icons";
import {
  feed_default_board_filter,
  feed_helper_prompt,
  update_feed_default_tab,
  update_feed_tabs,
  type UpdateFeedTab,
  type UpdateFeedTabId,
} from "@/data/update-feed-data";

type UpdateFeedPanelProps = {
  is_open: boolean;
  onClose: () => void;
};

/** Which read state the feed list is filtered to. */
type FeedReadFilter = "unread" | "all";

const read_filter_labels: Record<FeedReadFilter, string> = {
  unread: "Unread updates",
  all: "All updates",
};

/** Resolves a tab's optional leading glyph. */
const renderTabIcon = (tab: UpdateFeedTab) => {
  if (tab.icon === "mention") return <MentionIcon size={14} />;
  if (tab.icon === "bookmark") return <BookmarkIcon size={13} />;
  return null;
};

/**
 * Wide update-feed drawer opened from the AppTopBar feed button. A left sidebar
 * filters by board while the content pane shows the "All updates",
 * "I was mentioned", "Bookmarked", "All account" and "Scheduled" tabs, a
 * read-state filter and the feed cards. Backed by real `BoardItemComment`/
 * `BoardComment` rows via {@link useFeedUpdates}, kept live over the
 * `feed.{user_id}` Reverb channel.
 */
const UpdateFeedPanel: React.FC<UpdateFeedPanelProps> = ({ is_open, onClose }) => {
  const [active_tab, setActiveTab] =
    useState<UpdateFeedTabId>(update_feed_default_tab);
  const [active_board, setActiveBoard] = useState(feed_default_board_filter);
  const [read_filter, setReadFilter] = useState<FeedReadFilter>("all");
  const [is_filter_open, setIsFilterOpen] = useState(false);

  const { updates, boards, bookmarkUpdate, likeUpdate, replyToUpdate, scheduleReply, markSeen } =
    useFeedUpdates({ tab: active_tab, board_id: active_board });

  const visible_updates = useMemo(
    () => updates.filter((update) => read_filter === "all" || update.is_unread),
    [updates, read_filter]
  );

  const selectReadFilter = (value: FeedReadFilter) => {
    setReadFilter(value);
    setIsFilterOpen(false);
  };

  return (
    <SlideOverDrawer
      is_open={is_open}
      onClose={onClose}
      aria_label="Update feed"
      orientation="horizontal"
      width={960}
    >
      {/* Feed sidebar: title, board filters */}
      <aside className="hidden w-[262px] flex-none flex-col gap-[26px] border-r border-shell-border px-[22px] py-[26px] sm:flex">
        <div>
          <div className="flex items-center gap-[9px]">
            <h2 className="text-[23px] font-extrabold tracking-[-0.01em]">
              Update feed
            </h2>
            <ChatBubbleIcon size={18} className="text-[#7fb2ff]" />
          </div>
          <p className="mt-1.5 text-[12.5px] text-shell-text-muted">
            {feed_helper_prompt}{" "}
            <button
              type="button"
              className="text-[#7fb2ff] transition-colors hover:text-[#9cc4ff]"
            >
              See more
            </button>
          </p>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[15px] font-bold">Filter by Board</span>
            <button
              type="button"
              className="flex items-center gap-[5px] text-[11.5px] text-shell-text-muted transition-colors hover:text-shell-text"
            >
              <FeedSettingsIcon size={13} />
              Feed settings
            </button>
          </div>

          {boards.map((board) => {
            const is_active = board.id === active_board;
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => setActiveBoard(board.id)}
                className={`mb-1.5 flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-[13.5px] transition-colors ${
                  is_active
                    ? "border border-shell-border-strong bg-shell-hover-strong font-semibold text-shell-text"
                    : "font-medium text-shell-text-secondary hover:bg-shell-hover"
                }`}
              >
                <span>{board.name}</span>
                <span className="text-shell-text-muted">{board.count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Feed content: tabs, read filter, list */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Tabs + close */}
        <div className="relative flex flex-none items-center gap-[26px] overflow-x-auto border-b border-shell-border px-6 pt-[18px]">
          {update_feed_tabs.map((tab) => {
            const is_active = tab.id === active_tab;
            const icon = renderTabIcon(tab);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px flex flex-none items-center gap-1.5 whitespace-nowrap border-b-2 pb-3.5 text-[13.5px] transition-colors ${
                  is_active
                    ? "border-brand-500 font-semibold text-shell-text"
                    : "border-transparent font-medium text-shell-text-muted hover:text-shell-text"
                }`}
              >
                {icon}
                {tab.label}
                {tab.is_new && (
                  <span className="rounded-[5px] border border-[#3a5a80] px-[5px] py-px text-[9.5px] font-bold text-[#7fb2ff]">
                    New
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto mb-2 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            aria-label="Close update feed"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="shell-scrollbar flex-1 overflow-y-auto px-6 pb-8 pt-5">
          {/* Read-state filter */}
          <div className="relative mb-[18px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-shell-text-secondary">
            Show
            <button
              type="button"
              onClick={() => setIsFilterOpen((previous) => !previous)}
              className="dropdown-toggle flex items-center gap-1.5 text-shell-text"
              aria-haspopup="menu"
              aria-expanded={is_filter_open}
            >
              {read_filter_labels[read_filter]}
              <ChevronDownIcon size={11} />
            </button>
            <Dropdown
              isOpen={is_filter_open}
              onClose={() => setIsFilterOpen(false)}
              className="!left-9 !right-auto mt-1 w-[168px] !border-shell-border-strong !bg-shell-panel p-1.5"
            >
              {(Object.keys(read_filter_labels) as FeedReadFilter[]).map(
                (value) => (
                  <DropdownItem
                    key={value}
                    tag="button"
                    baseClassName=""
                    onItemClick={() => selectReadFilter(value)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-theme-sm font-medium hover:bg-shell-hover ${
                      read_filter === value ? "!text-shell-text" : "!text-shell-text-secondary"
                    }`}
                  >
                    {read_filter_labels[value]}
                  </DropdownItem>
                )
              )}
            </Dropdown>
          </div>

          {visible_updates.length === 0 ? (
            <p className="pt-6 text-center text-[13px] text-shell-text-muted">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {visible_updates.map((update) => (
                <UpdateFeedCard
                  key={update.id}
                  update={update}
                  onLike={likeUpdate}
                  onBookmark={bookmarkUpdate}
                  onReply={replyToUpdate}
                  onSchedule={scheduleReply}
                  onMarkSeen={markSeen}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SlideOverDrawer>
  );
};

export default UpdateFeedPanel;
