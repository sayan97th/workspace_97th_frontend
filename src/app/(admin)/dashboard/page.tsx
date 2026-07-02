import type { Metadata } from "next";
import { FileIcon, FolderIcon, StarIcon } from "@/layout/workspace-icons";

export const metadata: Metadata = {
  title: "Dashboard | Workspace 97th",
  description: "Home for Workspace 97th Dashboard ",
};

type RecentItem = {
  id: string;
  label: string;
  kind: "file" | "folder";
};

const recent_items: RecentItem[] = [
  { id: "mcp", label: "MCP getting started", kind: "file" },
  { id: "teamjaecie", label: "Team Jaecie", kind: "folder" },
  { id: "teamblake", label: "Team Blake", kind: "folder" },
  { id: "retro", label: "Retrospectives", kind: "folder" },
  { id: "salesres", label: "Sales Resources", kind: "folder" },
];

export default function Dashboard() {
  return (
    <div className="mt-2.5 px-10 pb-[60px]">
      {recent_items.map((item, index) => (
        <div
          key={item.id}
          className={`flex cursor-pointer items-center gap-3.5 rounded-lg px-2 py-[15px] hover:bg-[#F4F4F2] ${index < recent_items.length - 1 ? "border-b border-[#ECECEA]" : ""
            }`}
        >
          <span className="flex flex-none text-gray-400">
            {item.kind === "file" ? <FileIcon /> : <FolderIcon size={17} />}
          </span>
          <span className="flex-1 text-[15px] font-medium text-gray-900">{item.label}</span>
          <span className="flex flex-none text-gray-200">
            <StarIcon size={16} />
          </span>
        </div>
      ))}
    </div>
  );
}
