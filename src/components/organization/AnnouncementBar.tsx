"use client";
import React from "react";
import { AlertTriangle, CircleCheck, Info, OctagonAlert, X } from "lucide-react";
import type { AnnouncementTone } from "@/types/organization";
import { announcementToneClass } from "./announcement-tones";

const TONE_ICONS: Record<AnnouncementTone, React.ElementType> = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  critical: OctagonAlert,
};

export type AnnouncementBarProps = {
  message: string;
  tone: AnnouncementTone;
  link_label?: string | null;
  link_url?: string | null;
  /** Shows the close button, omitted in the editor preview. */
  onDismiss?: () => void;
  /** Pins the colors to one theme instead of following the app, used by the Live preview. */
  theme?: "light" | "dark";
  className?: string;
};

/** The organization announcement strip, presentational so the editor can preview it as typed. */
const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  message,
  tone,
  link_label,
  link_url,
  onDismiss,
  theme,
  className = "",
}) => {
  const ToneIcon = TONE_ICONS[tone];

  return (
    <div
      role={tone === "critical" || tone === "warning" ? "alert" : "status"}
      className={`flex min-h-9 items-center gap-2.5 px-4 py-1.5 text-[13px] leading-snug ${announcementToneClass(tone, theme)} ${className}`}
    >
      <ToneIcon className="h-4 w-4 flex-none" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="break-words">{message}</span>
        {link_label && link_url ? (
          <a
            href={link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 font-semibold underline underline-offset-2 hover:no-underline"
          >
            {link_label}
          </a>
        ) : null}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

export default AnnouncementBar;
