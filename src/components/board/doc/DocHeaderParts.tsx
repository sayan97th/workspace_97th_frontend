"use client";
import React, { useLayoutEffect, useRef } from "react";
import { Clock, FileLock2, FileText, Loader } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { BoardType } from "@/types/workspace";
import "./doc-page.css";

/** "Oct 12, 2026, 14:30", the way monday's doc header shows dates. */
export const formatDocDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
};

/** The doc icon left of the title, with a lock for a private doc like monday's. */
export const DocTypeIcon: React.FC<{ board_type?: BoardType; size?: number }> = ({ board_type, size = 22 }) => {
  const Icon = board_type === "private" ? FileLock2 : FileText;
  return <Icon size={size} className="flex-none text-[var(--doc-text-secondary)]" aria-hidden="true" />;
};

type DocMetaRowProps = {
  creator: { full_name?: string; profile_photo_url: string | null } | null | undefined;
  created_at: string | null | undefined;
  updated_at: string | null | undefined;
  className?: string;
};

/** "Creator {name}  Created {date}  Last updated {date}" under a doc's title. */
export const DocMetaRow: React.FC<DocMetaRowProps> = ({ creator, created_at, updated_at, className = "" }) => (
  <div className={`doc-meta-row ${className}`}>
    <span className="doc-meta-item">
      <UserAvatar user={creator} size={22} font_size={9} />
      Creator <strong>{creator?.full_name ?? "Unknown"}</strong>
    </span>
    <span className="doc-meta-item">
      <Loader size={18} aria-hidden="true" />
      Created <strong>{formatDocDate(created_at)}</strong>
    </span>
    <span className="doc-meta-item">
      <Clock size={18} aria-hidden="true" />
      Last updated <strong>{formatDocDate(updated_at ?? created_at)}</strong>
    </span>
  </div>
);

type DocTitleProps = {
  label: string;
  editable: boolean;
  onRename: (label: string) => Promise<void>;
  /** Enter leaves the title and moves the caret into the doc, like Notion. */
  onEnter: () => void;
  /** Accessible name of the editable heading. */
  aria_label?: string;
};

/** The doc's big title (a Doc page or a board Doc tab), renamed in place. Escape reverts, an empty title keeps the old name. */
export const DocTitle: React.FC<DocTitleProps> = ({ label, editable, onRename, onEnter, aria_label = "Doc title" }) => {
  const title_ref = useRef<HTMLHeadingElement>(null);

  // The heading's text lives in the DOM (React renders no children into it, so typing never
  // conflicts with a render). Outside renames are written back only while it isn't focused.
  useLayoutEffect(() => {
    const element = title_ref.current;
    if (element && document.activeElement !== element) element.textContent = label;
  }, [label]);

  const commit = () => {
    const element = title_ref.current;
    if (!element) return;
    const next_label = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!next_label) {
      element.textContent = label;
      return;
    }
    if (next_label !== label) void onRename(next_label);
  };

  return (
    <h1
      ref={title_ref}
      contentEditable={editable ? "plaintext-only" : false}
      spellCheck={false}
      role={editable ? "textbox" : undefined}
      aria-label={aria_label}
      className="min-w-0 rounded px-1 font-[family-name:var(--doc-font-heading)] text-[32px] leading-tight font-bold break-words text-[var(--doc-text)] outline-none hover:bg-[var(--doc-hover-soft)] focus:bg-transparent"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          title_ref.current?.blur();
          onEnter();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          if (title_ref.current) title_ref.current.textContent = label;
          title_ref.current?.blur();
        }
      }}
    />
  );
};
