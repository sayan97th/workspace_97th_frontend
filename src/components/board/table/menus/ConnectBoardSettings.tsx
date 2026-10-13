"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceContentItem } from "@/types/workspace";
import { connectedBoardIds } from "../cells/ConnectItemsCell";
import { useCellTooltip } from "../cells/CellTooltip";
import type { ColumnDef, ConnectedBoardSummary, ConnectSettings } from "../types";
import type { BoardTableActions } from "../useBoardTable";
import "./connect-board-settings.css";

/** Matches the API's `ConnectBoardColumnService::MAX_LINKED_BOARDS`. */
const MAX_LINKED_BOARDS = 10;
/** Boards listed to choose from, the Content endpoint's largest page. */
const BOARD_PAGE_SIZE = 100;

const MULTIPLE_ITEMS_INFO = "When on, each cell can link several items. When off, picking another item replaces the one in the cell.";
const TWO_WAY_INFO = "Adds a column to the connected board that shows the items linking to it, and keeps both sides in sync. Available when a single board is connected.";

interface ConnectBoardSettingsProps {
  column: ColumnDef;
  actions: BoardTableActions;
  onClose: () => void;
}

/** Which control is saving, so only that one shows it and the rest wait. */
type SavingKey = "disconnect" | "multiple" | "two_way" | "connect" | "mirror";

function connectedHeading(count: number): string {
  if (count === 0) return "This column is not connected to any board yet";
  if (count === 1) return "This column is connected to one board";
  return `This column is connected to ${count} boards`;
}

/**
 * "Connected board column settings" for a Connect boards column, monday.com style: the connected
 * boards (a lock on private ones, "Workspace > Folder" under the name, "Disconnect"), the
 * connection settings ("Allow linking to multiple items" switch, two-way "Turn on"), the notice
 * about who can see the column, and "Add a mirror column" / "+ Connect more boards". Every
 * change is saved right away. Renders its own card, the caller places it (cell popover or dialog).
 */
export default function ConnectBoardSettings({ column, actions, onClose }: ConnectBoardSettingsProps) {
  const settings: ConnectSettings = column.connect ?? { linked_board_ids: connectedBoardIds(column), allow_multiple_items: true, two_way: false };
  const board_ids = settings.linked_board_ids;
  const board_ids_key = board_ids.join(",");

  const [view, setView] = useState<"settings" | "connect">("settings");
  const [summaries, setSummaries] = useState<ConnectedBoardSummary[] | null>(null);
  const [saving, setSaving] = useState<SavingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [is_notice_open, setIsNoticeOpen] = useState(false);

  // The boards' names, privacy and location, read again whenever the connected boards change.
  useEffect(() => {
    let cancelled = false;
    actions
      .fetchConnectedBoards(column.id)
      .then((boards) => {
        if (!cancelled) setSummaries(boards);
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actions, column.id, board_ids_key]);

  const save = async (key: SavingKey, next: Partial<ConnectSettings>) => {
    if (saving) return false;
    const merged = { ...settings, ...next };
    // Two-way only works with a single connected board.
    merged.two_way = merged.two_way && merged.linked_board_ids.length === 1;
    setSaving(key);
    setError(null);
    try {
      await actions.updateConnectSettings(column.id, merged);
      return true;
    } catch (save_error) {
      setError(getApiErrorMessage(save_error, "The settings could not be saved."));
      return false;
    } finally {
      setSaving(null);
    }
  };

  const addMirror = async () => {
    if (saving) return;
    setSaving("mirror");
    setError(null);
    try {
      await actions.addMirrorColumn(column.id);
    } catch (mirror_error) {
      setError(getApiErrorMessage(mirror_error, "The mirror column could not be added."));
      setSaving(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (view === "connect") setView("settings");
    else onClose();
  };

  if (view === "connect") {
    return (
      <div className="connect-settings" role="dialog" aria-label="Connect more boards" onKeyDown={handleKeyDown}>
        <ConnectMoreBoards
          connected_ids={board_ids}
          is_saving={saving === "connect"}
          error={error}
          onBack={() => {
            setError(null);
            setView("settings");
          }}
          onConnect={async (board_id) => {
            if (await save("connect", { linked_board_ids: [...board_ids, board_id] })) setView("settings");
          }}
        />
      </div>
    );
  }

  const two_way_available = board_ids.length === 1;

  return (
    <div className="connect-settings" role="dialog" aria-label="Connected board column settings" onKeyDown={handleKeyDown}>
      <div className="connect-settings__body shell-scrollbar">
        <h2 className="connect-settings__title">Connected board column settings</h2>

        <h3 className="connect-settings__heading">{connectedHeading(board_ids.length)}</h3>
        <div className="connect-settings__boards">
          {board_ids.length === 0 && <div className="connect-settings__empty">Connect a board to link its items from this column.</div>}
          {board_ids.map((board_id) => {
            const summary = summaries?.find((board) => board.id === board_id);
            return (
              <div key={board_id} className="connect-settings__board">
                <div className="connect-settings__board-text">
                  {!summaries ? (
                    <div className="connect-settings__board-path">Loading...</div>
                  ) : summary?.is_accessible ? (
                    <>
                      <div className="connect-settings__board-name">
                        {summary.is_private && <LockIcon label="Private board" />}
                        <span>{summary.name}</span>
                      </div>
                      {summary.path.length > 0 && <div className="connect-settings__board-path">{summary.path.join(" > ")}</div>}
                    </>
                  ) : (
                    <>
                      <div className="connect-settings__board-name connect-settings__board-name--hidden">
                        <LockIcon label="Private board" />
                        <span>{summary ? "Private board" : "Deleted board"}</span>
                      </div>
                      <div className="connect-settings__board-path">{summary ? "You do not have access to this board" : "This board no longer exists"}</div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="connect-settings__button connect-settings__button--secondary"
                  disabled={saving !== null}
                  onClick={() => void save("disconnect", { linked_board_ids: board_ids.filter((id) => id !== board_id) })}
                >
                  Disconnect
                </button>
              </div>
            );
          })}
        </div>

        <div className="connect-settings__section">
          <h3 className="connect-settings__heading">Connection settings</h3>
          <div className="connect-settings__row">
            <span className="connect-settings__row-label">
              Allow linking to multiple items
              <InfoTip text={MULTIPLE_ITEMS_INFO} />
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.allow_multiple_items}
              aria-label="Allow linking to multiple items"
              className="connect-settings__switch"
              disabled={saving !== null}
              onClick={() => void save("multiple", { allow_multiple_items: !settings.allow_multiple_items })}
            />
          </div>
          <div className="connect-settings__row">
            <span className="connect-settings__row-label">
              {settings.two_way ? "Two-way connection is on" : "Turn on two-way connection"}
              <InfoTip text={TWO_WAY_INFO} />
            </span>
            <button
              type="button"
              className="connect-settings__button connect-settings__button--secondary"
              disabled={saving !== null || (!settings.two_way && !two_way_available)}
              onClick={() => void save("two_way", { two_way: !settings.two_way })}
            >
              {saving === "two_way" ? "Saving..." : settings.two_way ? "Turn off" : "Turn on"}
            </button>
          </div>
        </div>

        <div className="connect-settings__notice">
          Only users with access to all connected boards can see this column&apos;s contents.{" "}
          <button type="button" className="connect-settings__link" aria-expanded={is_notice_open} onClick={() => setIsNoticeOpen((current) => !current)}>
            {is_notice_open ? "Show less" : "Learn more"}
          </button>
          {is_notice_open && (
            <div className="connect-settings__notice-more">
              Everyone else sees the column empty. To share its contents, add those people to every connected board, or connect only boards they can open.
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="connect-settings__error">
            {error}
          </div>
        )}
      </div>

      <div className="connect-settings__footer">
        <button type="button" className="connect-settings__button connect-settings__button--tertiary" disabled={saving !== null || board_ids.length === 0} onClick={() => void addMirror()}>
          {saving === "mirror" ? "Adding..." : "Add a mirror column"}
        </button>
        <button
          type="button"
          className="connect-settings__button connect-settings__button--primary"
          disabled={saving !== null || board_ids.length >= MAX_LINKED_BOARDS}
          onClick={() => {
            setError(null);
            setView("connect");
          }}
        >
          + {board_ids.length === 0 ? "Connect boards" : "Connect more boards"}
        </button>
      </div>
    </div>
  );
}

interface ConnectMoreBoardsProps {
  connected_ids: string[];
  is_saving: boolean;
  error: string | null;
  onBack: () => void;
  onConnect: (board_id: string) => Promise<void>;
}

/** "Connect more boards": every board the user may open that is not connected yet, with its location. */
function ConnectMoreBoards({ connected_ids, is_saving, error, onBack, onConnect }: ConnectMoreBoardsProps) {
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<WorkspaceContentItem[] | null>(null);
  const [load_error, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workspaceService
      .getContentItems(1, BOARD_PAGE_SIZE, { asset_type: ["board"] })
      .then((page) => {
        if (!cancelled) setBoards(page.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalized_query = query.trim().toLowerCase();
  const choices = useMemo(
    () =>
      (boards ?? [])
        .filter((board) => !connected_ids.includes(String(board.id)))
        .map((board) => ({ board, path: [board.workspace?.name, ...board.folder_path.map((folder) => folder.label)].filter(Boolean).join(" > ") }))
        .filter(({ board, path }) => !normalized_query || board.label.toLowerCase().includes(normalized_query) || path.toLowerCase().includes(normalized_query)),
    [boards, connected_ids, normalized_query]
  );

  return (
    <>
      <div className="connect-settings__body shell-scrollbar">
        <h2 className="connect-settings__title">
          <button type="button" className="connect-settings__back" onClick={onBack} aria-label="Back to settings">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
              <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          Connect more boards
        </h2>
        <label className="connect-settings__search">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.4 10.4 L13.6 13.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search boards" aria-label="Search boards" />
        </label>
        <div className="connect-settings__choices shell-scrollbar" role="list">
          {choices.map(({ board, path }) => (
            <button key={board.id} type="button" role="listitem" className="connect-settings__choice" disabled={is_saving} onClick={() => void onConnect(String(board.id))}>
              <span className="connect-settings__board-text">
                <span className="connect-settings__board-name">
                  {board.board_type === "private" && <LockIcon label="Private board" />}
                  <span>{board.label}</span>
                </span>
                {path && <span className="connect-settings__board-path" style={{ display: "block" }}>{path}</span>}
              </span>
            </button>
          ))}
          {!boards && !load_error && <div className="connect-settings__empty">Loading...</div>}
          {load_error && <div className="connect-settings__empty">The boards could not be loaded.</div>}
          {boards && choices.length === 0 && <div className="connect-settings__empty">No boards found.</div>}
        </div>
        {is_saving && <div className="connect-settings__note">Connecting...</div>}
        {error && (
          <div role="alert" className="connect-settings__error">
            {error}
          </div>
        )}
      </div>
      <div className="connect-settings__footer">
        <button type="button" className="connect-settings__button connect-settings__button--tertiary" onClick={onBack}>
          Cancel
        </button>
      </div>
    </>
  );
}

/** The (i) next to a setting, explaining it in the shared dark tooltip. */
function InfoTip({ text }: { text: ReactNode }) {
  const { anchor_props, tooltip } = useCellTooltip<HTMLButtonElement>(text);
  return (
    <>
      <button type="button" {...anchor_props} className="connect-settings__info" aria-label={typeof text === "string" ? text : "More information"}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.2 V11.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
        </svg>
      </button>
      {tooltip}
    </>
  );
}

function LockIcon({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" role="img" aria-label={label} style={{ flex: "none" }}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7 V5.2 a2.5 2.5 0 0 1 5 0 V7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
