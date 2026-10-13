import type { ReactNode } from "react";
import type { CellFileSource } from "../types";

/**
 * Everything the Files menu and its link dialog need per link source. The
 * hosts mirror `StoreBoardItemCellFileLinkRequest::PROVIDER_HOSTS` in the
 * API, so a wrong provider link is caught before the request is sent.
 */
export interface FileSourceConfig {
  menu_label: string;
  dialog_title: string;
  url_label: string;
  url_placeholder: string;
  /** Null accepts any host. */
  allowed_hosts: string[] | null;
  provider_name: string | null;
}

export const FILE_SOURCES: Record<CellFileSource, FileSourceConfig> = {
  link: {
    menu_label: "From Link",
    dialog_title: "Upload file from link",
    url_label: "Paste any type of link",
    url_placeholder: "e.g. pdf, adobe, miro, figma..",
    allowed_hosts: null,
    provider_name: null,
  },
  google_drive: {
    menu_label: "From Google Drive",
    dialog_title: "Add file from Google Drive",
    url_label: "Paste a Google Drive, Docs, Sheets or Slides link",
    url_placeholder: "e.g. https://docs.google.com/spreadsheets/d/...",
    allowed_hosts: ["drive.google.com", "docs.google.com"],
    provider_name: "Google Drive",
  },
  dropbox: {
    menu_label: "From Dropbox",
    dialog_title: "Add file from Dropbox",
    url_label: "Paste a Dropbox share link",
    url_placeholder: "e.g. https://www.dropbox.com/s/...",
    allowed_hosts: ["dropbox.com", "dropboxusercontent.com", "db.tt"],
    provider_name: "Dropbox",
  },
  box: {
    menu_label: "From Box",
    dialog_title: "Add file from Box",
    url_label: "Paste a Box share link",
    url_placeholder: "e.g. https://app.box.com/s/...",
    allowed_hosts: ["box.com", "box.net", "boxcloud.com"],
    provider_name: "Box",
  },
  onedrive: {
    menu_label: "From OneDrive & SharePoint",
    dialog_title: "Add file from OneDrive & SharePoint",
    url_label: "Paste a OneDrive or SharePoint link",
    url_placeholder: "e.g. https://yourcompany.sharepoint.com/...",
    allowed_hosts: ["onedrive.live.com", "onedrive.com", "1drv.ms", "sharepoint.com", "sharepoint.us"],
    provider_name: "OneDrive or SharePoint",
  },
};

/** The cloud providers, in the order the Files menu lists them after "From Link". */
export const PROVIDER_SOURCES: CellFileSource[] = ["google_drive", "dropbox", "box", "onedrive"];

/** Whether `url` is hosted where `source` allows (its host or a subdomain of it). */
export function isHostAllowed(url: string, source: CellFileSource): boolean {
  const allowed_hosts = FILE_SOURCES[source].allowed_hosts;
  if (!allowed_hosts) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowed_hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

const ICON_PROPS = { viewBox: "0 0 16 16", width: 16, height: 16, fill: "none", "aria-hidden": true } as const;
const STROKE_PROPS = { stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Outline glyphs in monday's menu style, one per Files menu option. */
export function PaperclipIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M11.5 5 L6.4 10.1 A1.9 1.9 0 0 0 9.1 12.8 L13.4 8.5 A3.2 3.2 0 0 0 8.9 4 L4.3 8.6 A4.4 4.4 0 0 0 10.5 14.8" {...STROKE_PROPS} />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 5.2 h2.6 l1.2-1.8 h4.4 l1.2 1.8 H14 v7.6 H2 Z" {...STROKE_PROPS} />
      <circle cx="8" cy="8.8" r="2.3" {...STROKE_PROPS} />
    </svg>
  );
}

export function DocIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3.5 1.8 h6 l3 3 v9.4 h-9 Z M9.5 1.8 v3 h3" {...STROKE_PROPS} />
      <path d="M5.6 8 h4.8 M5.6 10.4 h4.8 M5.6 12.6 h3" {...STROKE_PROPS} />
    </svg>
  );
}

export function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...ICON_PROPS} width={size} height={size}>
      <path d="M6.5 9.5 L9.5 6.5 M7 5 l1.6-1.6 a2.4 2.4 0 0 1 3.4 3.4 L10.4 8.4 M9 11 l-1.6 1.6 a2.4 2.4 0 0 1-3.4-3.4 L5.6 7.6" {...STROKE_PROPS} />
    </svg>
  );
}

function GoogleDriveIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5.8 2.2 h4.4 l4.3 7.5 l-2.2 3.9 H3.7 L1.5 9.7 Z M5.8 2.2 l4.3 7.5 h4.4 M10.2 2.2 L5.9 9.7 l-2.2 3.9 M1.5 9.7 h8.6" {...STROKE_PROPS} />
    </svg>
  );
}

function DropboxIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4.7 2 L1.4 4.2 L4.7 6.4 L8 4.2 Z M11.3 2 L8 4.2 L11.3 6.4 L14.6 4.2 Z M4.7 6.4 L1.4 8.6 L4.7 10.8 L8 8.6 Z M11.3 6.4 L8 8.6 L11.3 10.8 L14.6 8.6 Z M4.9 12 L8 14 L11.1 12" {...STROKE_PROPS} />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 2.2 v9.3" {...STROKE_PROPS} strokeWidth={1.8} />
      <circle cx="7.4" cy="10.2" r="3.3" {...STROKE_PROPS} strokeWidth={1.8} />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4.4 12.6 A2.9 2.9 0 0 1 4 6.8 A3.9 3.9 0 0 1 11.5 6 A3.3 3.3 0 0 1 12 12.6 Z" {...STROKE_PROPS} />
      <path d="M6.6 9.4 A2.6 2.6 0 0 1 11.6 9" {...STROKE_PROPS} />
    </svg>
  );
}

export const SOURCE_ICONS: Record<CellFileSource, () => ReactNode> = {
  link: () => <LinkIcon />,
  google_drive: () => <GoogleDriveIcon />,
  dropbox: () => <DropboxIcon />,
  box: () => <BoxIcon />,
  onedrive: () => <CloudIcon />,
};

/** Larger brand colored marks for the provider dialogs' header. */
export function ProviderBadge({ source }: { source: CellFileSource }) {
  const badges: Partial<Record<CellFileSource, ReactNode>> = {
    google_drive: (
      <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
        <path d="M17 6 h14 l13 23 h-14 Z" fill="#ffba00" />
        <path d="M17 6 L4 29 l7 12 L24 18 Z" fill="#0f9d58" />
        <path d="M11 41 h26 l7-12 H18 Z" fill="#4285f4" />
      </svg>
    ),
    dropbox: (
      <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
        <path d="M14 6 L4 12.5 L14 19 L24 12.5 Z M34 6 L24 12.5 L34 19 L44 12.5 Z M14 19 L4 25.5 L14 32 L24 25.5 Z M34 19 L24 25.5 L34 32 L44 25.5 Z M14 34.5 L24 41 L34 34.5 L24 28 Z" fill="#0061ff" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
        <rect x="2" y="8" width="44" height="32" rx="8" fill="#0061d5" />
        <text x="24" y="31" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700" fill="#fff">
          box
        </text>
      </svg>
    ),
    onedrive: (
      <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
        <path d="M19 15 a11 11 0 0 1 19 5 a8 8 0 0 1 2 15.5 H14 Z" fill="#0364b8" />
        <path d="M12.5 36 a7.5 7.5 0 0 1-1.5-14.8 a10 10 0 0 1 17.6-3.6 L40 35.5 Z" fill="#28a8ea" />
      </svg>
    ),
  };
  return badges[source] ?? null;
}
