"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getApiErrorMessage } from "@/lib/api-error";
import { getUserInitials } from "@/lib/user";
import UpdateFeedCard from "./UpdateFeedCard";
import { useFeedUpdates } from "@/hooks/useFeedUpdates";
import {
  BookmarkIcon,
  ChevronDownIcon,
  CloseIcon,
  EyeOffIcon,
  InfoIcon,
  MentionIcon,
  MoreDotsIcon,
} from "@/icons/workspace-icons";
import {
  default_feed_filters,
  feed_default_board_filter,
  feed_default_show_mode,
  feed_helper_prompt,
  feed_show_options,
  feed_tab_help,
  update_feed_default_tab,
  update_feed_tabs,
  type FeedBoardFilter,
  type FeedFilters,
  type FeedShowMode,
  type UpdateFeedTab,
  type UpdateFeedTabId,
} from "@/data/update-feed-data";
import "./update-feed-modal.scss";

type UpdateFeedPanelProps = {
  is_open: boolean;
  onClose: () => void;
};

/** monday's double check, used by "Mark all updates as read" and "Close All". */
const DoubleCheckIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M2.5 12.5l4.5 4.5L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16l1 1L22.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The briefcase in front of "All account updates". */
const BriefcaseIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v2h3v-2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/** monday's gear in front of "Feed settings". */
const GearIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10.3 3.6a1.7 1.7 0 0 1 3.4 0l.1.7a1.7 1.7 0 0 0 2.5 1l.6-.3a1.7 1.7 0 0 1 2.4 2.4l-.3.6a1.7 1.7 0 0 0 1 2.5l.7.1a1.7 1.7 0 0 1 0 3.4l-.7.1a1.7 1.7 0 0 0-1 2.5l.3.6a1.7 1.7 0 0 1-2.4 2.4l-.6-.3a1.7 1.7 0 0 0-2.5 1l-.1.7a1.7 1.7 0 0 1-3.4 0l-.1-.7a1.7 1.7 0 0 0-2.5-1l-.6.3a1.7 1.7 0 0 1-2.4-2.4l.3-.6a1.7 1.7 0 0 0-1-2.5l-.7-.1a1.7 1.7 0 0 1 0-3.4l.7-.1a1.7 1.7 0 0 0 1-2.5l-.3-.6a1.7 1.7 0 0 1 2.4-2.4l.6.3a1.7 1.7 0 0 0 2.5-1z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** Resolves a tab's leading glyph. */
const renderTabIcon = (tab: UpdateFeedTab) => {
  if (tab.icon === "mention") return <MentionIcon size={18} />;
  if (tab.icon === "bookmark") return <BookmarkIcon size={17} />;
  if (tab.icon === "account") return <BriefcaseIcon size={18} />;
  return null;
};

/** What a tab says when it has nothing to list. */
const EMPTY_TAB_MESSAGES: Record<string, { title: string; description: string }> = {
  all: { title: "Your update feed is empty", description: "Updates from the boards you are subscribed to will show up here." },
  mentioned: { title: "No mentions yet", description: "Updates where someone @mentions you will show up here." },
  bookmarked: { title: "No bookmarks yet", description: "Use \"Bookmark this update to inbox\" in an update's menu to keep it here." },
  account: { title: "No updates yet", description: "Updates from every board in your account will show up here." },
};

/**
 * The Update feed (Inbox), a large centered modal opened from the AppTopBar
 * feed button, rebuilt to match monday.com: a white left column with the
 * "Update feed (Inbox)" title, the "What goes in my update feed?" help, Feed
 * settings and the "Filter by Board" list (each board row has a "..." menu
 * with "Close All" and "Hide board updates from inbox"), and a light gray
 * content pane with the four monday tabs, the "Show Unread updates" picker,
 * "Mark all updates as read" and one card per thread, each with the big blue
 * check that reads it (with Undo). Backed by real `BoardItemComment` /
 * `BoardComment` rows via {@link useFeedUpdates}: pages in as it scrolls and
 * stays live over the `feed.{user_id}` Reverb channel.
 */
const UpdateFeedPanel: React.FC<UpdateFeedPanelProps> = ({ is_open, onClose }) => {
  const [active_tab, setActiveTab] = useState<UpdateFeedTabId>(update_feed_default_tab);
  const [active_board, setActiveBoard] = useState(feed_default_board_filter);
  const [show_mode, setShowMode] = useState<FeedShowMode>(feed_default_show_mode);
  const [is_show_menu_open, setIsShowMenuOpen] = useState(false);
  const [is_help_open, setIsHelpOpen] = useState(false);
  const [is_settings_open, setIsSettingsOpen] = useState(false);
  const [board_menu, setBoardMenu] = useState<{ board: FeedBoardFilter; anchor: HTMLElement } | null>(null);

  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const dialog_ref = useRef<HTMLDivElement>(null);
  const scroll_area_ref = useRef<HTMLDivElement>(null);
  const show_trigger_ref = useRef<HTMLButtonElement>(null);
  const help_trigger_ref = useRef<HTMLButtonElement>(null);
  const settings_trigger_ref = useRef<HTMLButtonElement>(null);

  const filters = useMemo<FeedFilters>(() => ({ ...default_feed_filters, unread_only: show_mode === "unread" }), [show_mode]);

  const {
    updates,
    pending_count,
    showPendingUpdates,
    boards,
    is_loading,
    is_loading_more,
    has_more,
    loadMore,
    bookmarkUpdate,
    likeUpdate,
    reactToUpdate,
    setFollowing,
    replyToUpdate,
    markAllSeen,
    markThreadRead,
    markThreadUnread,
    markBoardRead,
    hidden_boards,
    loadHiddenBoards,
    hideBoard,
    showBoard,
    editUpdate,
    deleteUpdate,
  } = useFeedUpdates({ tab: active_tab, board_id: active_board, filters });

  const current_user: BoardPersonOption = useMemo(
    () =>
      user
        ? {
            id: String(user.id),
            name: user.full_name,
            initials: getUserInitials(user),
            avatar_seed: user.id,
            avatar_url: user.profile_photo_url ?? undefined,
          }
        : { id: "0", name: "You", initials: "Y", avatar_seed: 0 },
    [user]
  );

  // Escape closes the inbox (a menu open inside it handles Escape first), the page behind stops scrolling.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => dialog_ref.current?.focus());
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
      cancelAnimationFrame(frame);
    };
  }, [is_open, onClose]);

  useEffect(() => {
    if (is_settings_open) loadHiddenBoards();
  }, [is_settings_open, loadHiddenBoards]);

  // A board that was hidden can not stay selected.
  useEffect(() => {
    if (active_board !== feed_default_board_filter && boards.length > 0 && !boards.some((board) => board.id === active_board)) {
      setActiveBoard(feed_default_board_filter);
    }
  }, [boards, active_board]);

  const likeCard = useCallback(
    (id: string) => void likeUpdate(id).catch(() => toastError("Couldn't update your like. Please try again.")),
    [likeUpdate, toastError]
  );
  const reactToCard = useCallback(
    (id: string, emoji: string) =>
      void reactToUpdate(id, emoji).catch(() => toastError("Couldn't update that reaction. Please try again.")),
    [reactToUpdate, toastError]
  );
  const replyToCard = useCallback(
    (id: string, body: string, mentioned_user_ids: number[]) =>
      void replyToUpdate(id, body, mentioned_user_ids).catch((error) =>
        toastError(getApiErrorMessage(error, "Couldn't post your reply. Please try again."))
      ),
    [replyToUpdate, toastError]
  );
  const bookmarkCard = useCallback(
    (id: string) => void bookmarkUpdate(id).catch(() => toastError("Couldn't update the bookmark. Please try again.")),
    [bookmarkUpdate, toastError]
  );

  /** The blue check: reads the thread with an Undo, or brings a read thread back as unread. */
  const toggleCardRead = useCallback(
    async (id: string, is_unread: boolean) => {
      try {
        if (!is_unread) {
          await markThreadUnread(id);
          return;
        }
        const undo = await markThreadRead(id);
        if (!undo) return;
        toastSuccess("Update marked as read", {
          dedupe_key: "feed-read",
          action_text: "Undo",
          onAction: () => void undo().catch(() => toastError("Couldn't undo. Please try again.")),
        });
      } catch {
        toastError("Couldn't update this update. Please try again.");
      }
    },
    [markThreadRead, markThreadUnread, toastSuccess, toastError]
  );

  const editCard = useCallback(
    async (id: string, body: string) => {
      try {
        await editUpdate(id, body);
      } catch (error) {
        toastError(getApiErrorMessage(error, "Couldn't save your changes. Please try again."));
        throw error;
      }
    },
    [editUpdate, toastError]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      try {
        const undo = await deleteUpdate(id);
        toastSuccess("Update deleted", {
          action_text: "Undo",
          onAction: () => void undo().catch((error) => toastError(getApiErrorMessage(error, "Couldn't restore the update."))),
        });
      } catch (error) {
        toastError(getApiErrorMessage(error, "Couldn't delete the update. Please try again."));
      }
    },
    [deleteUpdate, toastSuccess, toastError]
  );

  const sentinel_ref = useInfiniteScroll({
    onLoadMore: loadMore,
    can_load_more: is_open && has_more && !is_loading && !is_loading_more,
    root_ref: scroll_area_ref,
    watch: updates.length,
  });

  const showNewUpdates = () => {
    showPendingUpdates();
    scroll_area_ref.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markEverythingRead = async () => {
    try {
      await markAllSeen();
      toastSuccess("All updates marked as read");
    } catch {
      toastError("Couldn't mark the updates as read. Please try again.");
    }
  };

  const closeBoardUpdates = async (board: FeedBoardFilter) => {
    try {
      const marked = await markBoardRead(board.id);
      toastSuccess(marked === 1 ? "1 update marked as read" : `${marked} updates marked as read`);
    } catch {
      toastError("Couldn't mark the board updates as read. Please try again.");
    }
  };

  const hideBoardUpdates = async (board: FeedBoardFilter) => {
    try {
      await hideBoard(board.id);
      if (active_board === board.id) setActiveBoard(feed_default_board_filter);
      toastSuccess(`${board.name} updates hidden from your inbox`, {
        action_text: "Undo",
        onAction: () => void showBoard(board.id).catch(() => toastError("Couldn't show the board again. Please try again.")),
      });
    } catch {
      toastError("Couldn't hide the board updates. Please try again.");
    }
  };

  const board_menu_sections: ActionMenuSection[] = board_menu
    ? [
        {
          key: "board",
          items: [
            { key: "close-all", label: "Close All", icon: <DoubleCheckIcon size={18} />, onClick: () => void closeBoardUpdates(board_menu.board) },
            ...(board_menu.board.id === feed_default_board_filter
              ? []
              : [
                  {
                    key: "hide",
                    label: "Hide board updates from inbox",
                    icon: <EyeOffIcon size={18} />,
                    onClick: () => void hideBoardUpdates(board_menu.board),
                  },
                ]),
          ],
        },
      ]
    : [];

  const show_sections: ActionMenuSection[] = [
    {
      key: "show",
      items: feed_show_options.map((option) => ({
        key: option.id,
        label: option.label,
        is_selected: option.id === show_mode,
        onClick: () => setShowMode(option.id),
      })),
    },
  ];
  const show_label = feed_show_options.find((option) => option.id === show_mode)?.label ?? "";

  const empty_state =
    show_mode === "unread"
      ? { title: "You're all caught up", description: "There are no unread updates here." }
      : (EMPTY_TAB_MESSAGES[active_tab] ?? EMPTY_TAB_MESSAGES.all);

  return (
    <div className="uf-modal-root" data-open={is_open ? "true" : "false"} aria-hidden={!is_open}>
      <div className="uf-modal-backdrop" onClick={onClose} />

      <div ref={dialog_ref} role="dialog" aria-modal="true" aria-labelledby="update-feed-title" tabIndex={-1} className="uf-modal">
        <button type="button" onClick={onClose} className="uf-modal__close" aria-label="Close update feed">
          <CloseIcon size={22} />
        </button>

        {/* Left column: title, help, Feed settings and the board filter */}
        <aside className="uf-side">
          <h2 id="update-feed-title" className="uf-side__title">
            Update feed (Inbox)
          </h2>
          <div className="uf-side__help">
            <InfoIcon size={18} />
            <span>{feed_helper_prompt}</span>
            <button
              ref={help_trigger_ref}
              type="button"
              onClick={() => setIsHelpOpen((open) => !open)}
              aria-expanded={is_help_open}
              className="uf-side__see-more"
            >
              See more
            </button>
          </div>
          <BoardPopover anchor_el={help_trigger_ref.current} is_open={is_help_open} onClose={() => setIsHelpOpen(false)} width={340} align="start">
            <div className="uf-popover">
              <p className="uf-popover__title">Update feed view options</p>
              <p className="uf-popover__text">Filter the updates you see with the tabs at the top of your Update feed.</p>
              <ul className="uf-popover__list">
                {feed_tab_help.map((entry) => (
                  <li key={entry.title}>
                    <strong>{entry.title}</strong>
                    <span>{entry.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </BoardPopover>

          <div className="uf-side__filters-head">
            <h3 className="uf-side__subtitle">Filter by Board</h3>
            <button
              ref={settings_trigger_ref}
              type="button"
              onClick={() => setIsSettingsOpen((open) => !open)}
              aria-expanded={is_settings_open}
              className="uf-side__settings"
            >
              <GearIcon size={19} />
              Feed settings
            </button>
          </div>
          <BoardPopover anchor_el={settings_trigger_ref.current} is_open={is_settings_open} onClose={() => setIsSettingsOpen(false)} width={320} align="end">
            <div className="uf-popover">
              <p className="uf-popover__title">Hidden boards</p>
              {hidden_boards.length === 0 ? (
                <p className="uf-popover__text">
                  You are not hiding any board. Use the &quot;...&quot; menu of a board to hide its updates from your inbox.
                </p>
              ) : (
                <ul className="uf-popover__boards">
                  {hidden_boards.map((board) => (
                    <li key={board.id}>
                      <span className="truncate">{board.name}</span>
                      <button
                        type="button"
                        onClick={() => void showBoard(board.id).catch(() => toastError("Couldn't show the board again. Please try again."))}
                      >
                        Show in inbox
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </BoardPopover>

          <ul className="uf-side__boards" aria-label="Filter by board">
            {boards.map((board) => {
              const is_active = board.id === active_board;
              const badge = show_mode === "unread" ? board.unread_count : board.count;
              const is_menu_open = board_menu?.board.id === board.id;
              return (
                <li key={board.id} className="uf-board" data-active={is_active ? "true" : undefined} data-menu-open={is_menu_open ? "true" : undefined}>
                  <button type="button" onClick={() => setActiveBoard(board.id)} className="uf-board__select" aria-pressed={is_active}>
                    <span className="uf-board__name">{board.name}</span>
                  </button>
                  {badge > 0 && <span className="uf-board__count">{badge}</span>}
                  <button
                    type="button"
                    onClick={(event) => {
                      const anchor = event.currentTarget;
                      setBoardMenu((current) => (current?.board.id === board.id ? null : { board, anchor }));
                    }}
                    aria-haspopup="menu"
                    aria-expanded={is_menu_open}
                    aria-label={`${board.name} options`}
                    className="uf-board__menu"
                  >
                    <MoreDotsIcon size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <ActionMenu
            anchor_el={board_menu?.anchor ?? null}
            is_open={board_menu !== null}
            onClose={() => setBoardMenu(null)}
            sections={board_menu_sections}
            aria_label="Board options"
            width={300}
            align="start"
          />
        </aside>

        {/* Content: tabs, Show picker, Mark all and the cards */}
        <section className="uf-main" aria-label="Updates">
          <nav className="uf-tabs" role="tablist" aria-label="Update feed views">
            {update_feed_tabs.map((tab) => {
              const is_active = tab.id === active_tab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={is_active}
                  onClick={() => setActiveTab(tab.id)}
                  className="uf-tab"
                >
                  {renderTabIcon(tab)}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div ref={scroll_area_ref} className="uf-main__scroll">
            <div className="uf-main__inner">
              <div className="uf-toolbar">
                <button
                  ref={show_trigger_ref}
                  type="button"
                  onClick={() => setIsShowMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={is_show_menu_open}
                  className="uf-toolbar__show"
                >
                  <strong>Show</strong>
                  <span>{show_label}</span>
                  <ChevronDownIcon size={16} />
                </button>
                <ActionMenu
                  anchor_el={show_trigger_ref.current}
                  is_open={is_show_menu_open}
                  onClose={() => setIsShowMenuOpen(false)}
                  sections={show_sections}
                  aria_label="Show"
                  width={220}
                  align="start"
                  class_name="action-menu--selectable"
                />
                {active_tab !== "bookmarked" && (
                  <button type="button" onClick={() => void markEverythingRead()} className="uf-toolbar__mark-all">
                    <DoubleCheckIcon size={20} />
                    Mark all updates as read
                  </button>
                )}
              </div>

              {/* Live banner: updates other people posted while the inbox is open, held back so the cards being read do not jump. */}
              <div role="status" aria-live="polite" className="uf-banner-slot">
                {pending_count > 0 && (
                  <button type="button" onClick={showNewUpdates} className="uf-banner">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 10V2m0 0L2.5 5.5M6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {pending_count} new {pending_count === 1 ? "update" : "updates"}
                  </button>
                )}
              </div>

              {updates.length === 0 && !has_more ? (
                is_loading ? (
                  <div className="uf-skeletons" aria-label="Loading updates">
                    {[0, 1].map((index) => (
                      <div key={index} className="uf-skeleton" />
                    ))}
                  </div>
                ) : (
                  <div className="uf-empty">
                    <span className="uf-empty__icon" aria-hidden="true">
                      <DoubleCheckIcon size={30} />
                    </span>
                    <p className="uf-empty__title">{empty_state.title}</p>
                    <p className="uf-empty__text">{empty_state.description}</p>
                    {show_mode === "unread" && (
                      <button type="button" onClick={() => setShowMode("all")} className="uf-empty__action">
                        Show all updates
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div className="uf-list">
                  {updates.map((update) => (
                    <UpdateFeedCard
                      key={update.id}
                      update={update}
                      current_user={current_user}
                      onLike={likeCard}
                      onReact={reactToCard}
                      onBookmark={bookmarkCard}
                      onReply={replyToCard}
                      onToggleRead={(id, is_unread) => void toggleCardRead(id, is_unread)}
                      onFollow={setFollowing}
                      onEdit={editCard}
                      onDelete={(id) => void deleteCard(id)}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              )}

              {/* Sentinel: reaching it loads the next page. */}
              <div ref={sentinel_ref} aria-hidden="true" className="h-px" />
              {is_loading_more && <p className="uf-loading-more">Loading more...</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UpdateFeedPanel;
