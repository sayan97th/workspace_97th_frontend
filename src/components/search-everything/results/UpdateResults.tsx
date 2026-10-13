"use client";

import UserAvatar from "@/components/common/UserAvatar";
import { AttachmentIcon } from "@/icons/board-icons";
import type { UpdateResult } from "@/types/search-everything";
import { BoardGlyph, Highlight, TimeAgo, boardHref, itemHref, type NavigateTo } from "../shared";

type UpdateResultsProps = {
  updates: UpdateResult[];
  term: string;
  onNavigate: NavigateTo;
};

/**
 * "Updates": one card per update or reply, author avatar and name, the text
 * (clamped to six lines), and "time ago · item · board" underneath. A click
 * opens the item's drawer, where the update lives.
 */
export default function UpdateResults({ updates, term, onNavigate }: UpdateResultsProps) {
  return (
    <div className="search-everything__update-list">
      {updates.map((update) => {
        const href = update.board && update.item ? itemHref(update.board, update.item) : update.board ? boardHref(update.board) : null;

        return (
          <article
            key={update.id}
            className="search-everything__update"
            role={href ? "link" : undefined}
            tabIndex={href ? 0 : undefined}
            onClick={() => href && onNavigate(href)}
            onKeyDown={(event) => {
              if (href && event.key === "Enter") onNavigate(href);
            }}
            style={{ cursor: href ? "pointer" : undefined }}
          >
            <UserAvatar
              user={{ full_name: update.author?.full_name ?? "Deleted user", profile_photo_url: update.author?.photo_url ?? null }}
              size={40}
              className={update.author?.is_deactivated ? "opacity-50" : ""}
            />
            <div className="search-everything__update-main">
              <div className="search-everything__update-author">{update.author?.full_name ?? "Deleted user"}</div>
              <div className="search-everything__update-body">
                <Highlight text={update.excerpt} term={term} />
              </div>
              <div className="search-everything__meta">
                <TimeAgo iso={update.created_at} />
                {update.item && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="search-everything__meta-link">
                      <span className="search-everything__meta-text">{update.item.name}</span>
                    </span>
                  </>
                )}
                {update.board && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="search-everything__meta-link">
                      <BoardGlyph board={update.board} size={12} />
                      <span className="search-everything__meta-text">{update.board.label}</span>
                    </span>
                  </>
                )}
                {update.attachment_count > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-[3px]">
                      <AttachmentIcon size={12} />
                      {update.attachment_count}
                    </span>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
