"use client";
import React from "react";
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
