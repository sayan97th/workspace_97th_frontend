"use client";
import React, { useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import AdminBoardsTable from "../content/AdminBoardsTable";
import SettingsDropdown from "../SettingsDropdown";
import { TIDY_UP_THRESHOLDS, useContentDirectoryManager } from "../useContentDirectoryManager";

const threshold_options = TIDY_UP_THRESHOLDS.map((days) => ({
  id: String(days),
  label: days === 365 ? "No activity for 1 year" : `No activity for ${days} days`,
}));

/**
 * Administration > Directory > Tidy up: active boards nobody has touched for a while, the
 * stalest first, so an admin can archive them or hand them to a new owner in bulk. The
 * monday.com "Tidy up" admin page.
 */
const TidyUpSection: React.FC = () => {
  const content = useContentDirectoryManager("tidy_up");
  const [is_archive_open, setIsArchiveOpen] = useState(false);
  const count = content.selection.selected_ids.length;

  return (
    <div>
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
        Keep the account clean. These boards had no item changes, updates or board activity in the chosen period.
        Archive them, or reassign them to someone who will pick them up.
      </p>

      <AdminBoardsTable
        content={content}
        toolbar_start={
          <SettingsDropdown
            value={String(content.inactive_days)}
            options={threshold_options}
            onChange={(value) => content.setInactiveDays(Number(value))}
            className="w-[210px] py-[9px]"
          />
        }
        onRequestArchive={() => setIsArchiveOpen(true)}
        empty_message="Nice and tidy. No inactive boards for this period."
      />

      <ConfirmActionModal
        is_open={is_archive_open}
        title={count === 1 ? "Archive 1 inactive board" : `Archive ${count} inactive boards`}
        description="Archived boards disappear from the workspace sidebar but keep all their data. They can be restored from the Content directory."
        confirm_label="Archive"
        variant="warning"
        onConfirm={async () => {
          await content.archiveSelected();
          setIsArchiveOpen(false);
        }}
        onClose={() => setIsArchiveOpen(false)}
      />
    </div>
  );
};

export default TidyUpSection;
