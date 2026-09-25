"use client";
import React, { useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import AdminBoardsTable from "../content/AdminBoardsTable";
import { useContentDirectoryManager } from "../useContentDirectoryManager";

/**
 * Administration > Directory > Content directory: every board in the account, whatever its
 * workspace or privacy, with per column filters, CSV export and bulk archive, restore and
 * owner reassignment. The monday.com "Content directory" admin page.
 */
const ContentDirectorySection: React.FC = () => {
  const content = useContentDirectoryManager("directory");
  const [is_archive_open, setIsArchiveOpen] = useState(false);
  const count = content.selection.selected_ids.length;

  return (
    <div>
      <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
        Browse every board in the account, including private ones, see who owns what and how active it is, and clean up
        in bulk.
      </p>

      <AdminBoardsTable
        content={content}
        onRequestArchive={() => setIsArchiveOpen(true)}
        empty_message="No boards match these filters."
      />

      <ConfirmActionModal
        is_open={is_archive_open}
        title={count === 1 ? "Archive 1 board" : `Archive ${count} boards`}
        description="Archived boards disappear from the workspace sidebar but keep all their data. You can restore them from here at any time."
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

export default ContentDirectorySection;
