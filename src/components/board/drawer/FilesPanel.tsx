import React from "react";
import { FilesTabIcon } from "@/icons/drawer-icons";

export type FilesPanelProps = {
  item_title: string;
};

/** Placeholder "Files" tab shown until per-item file storage is wired up. */
const FilesPanel: React.FC<FilesPanelProps> = ({ item_title }) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-6 text-center text-[#6e7b7d]">
    <FilesTabIcon size={46} className="mb-3.5 text-[#33403f]" />
    <div className="text-[15px] font-bold text-[#b4bcbd]">No files yet</div>
    <div className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed">
      Drag &amp; drop documents, screenshots or contracts to attach them to {item_title}.
    </div>
    <button
      type="button"
      className="mt-4 rounded-[9px] border border-white/[0.14] bg-[#132524] px-5 py-2.5 text-[13px] font-semibold text-[#d7dcdc] hover:border-[#00c875] hover:text-white"
    >
      Upload files
    </button>
  </div>
);

export default FilesPanel;
