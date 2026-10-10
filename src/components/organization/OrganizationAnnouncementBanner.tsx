"use client";
import React, { useEffect, useState } from "react";
import { useBranding } from "@/context/BrandingContext";
import AnnouncementBar from "./AnnouncementBar";

/** Remembers which version of the banner this browser closed, keyed by its `published_at`. */
const DISMISSED_STORAGE_KEY = "organization_announcement_dismissed";

const readDismissedVersion = (): string | null => {
  try {
    return localStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Account wide announcement set in Administration > Organization, shown under the top bar for
 * every signed in user. Closing it hides that version only, editing the banner shows it again.
 */
const OrganizationAnnouncementBanner: React.FC = () => {
  const { branding } = useBranding();
  const announcement = branding.announcement;
  const version = announcement?.published_at ?? announcement?.message ?? "";
  const [dismissed_version, setDismissedVersion] = useState<string | null>(null);

  useEffect(() => setDismissedVersion(readDismissedVersion()), []);

  if (!announcement || (announcement.is_dismissible && dismissed_version === version)) return null;

  const dismiss = () => {
    setDismissedVersion(version);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, version);
    } catch {
      // Without storage the banner simply comes back on the next page load.
    }
  };

  return (
    <AnnouncementBar
      message={announcement.message}
      tone={announcement.tone}
      link_label={announcement.link_label}
      link_url={announcement.link_url}
      onDismiss={announcement.is_dismissible ? dismiss : undefined}
      className="flex-none"
    />
  );
};

export default OrganizationAnnouncementBanner;
