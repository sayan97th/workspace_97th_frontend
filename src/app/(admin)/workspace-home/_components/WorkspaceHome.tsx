"use client";
import React, { useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ClockIcon,
  CollaboratorsIcon,
  ContentTabIcon,
  FileIcon,
  FolderIcon,
  MoreDotsIcon,
  PermissionsIcon,
  PersonIcon,
  StarIcon,
} from "@/layout/workspace-icons";
import WorkspaceContent from "./WorkspaceContent";

type TabId = "recents" | "content" | "collaborators" | "permissions";

type TabDefinition = {
  id: TabId;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

type RecentItem = {
  id: string;
  label: string;
  kind: "file" | "folder";
};

const workspace_tabs: TabDefinition[] = [
  { id: "recents", label: "Recents", Icon: ClockIcon },
  { id: "content", label: "Content", Icon: ContentTabIcon },
  { id: "collaborators", label: "Collaborators", Icon: CollaboratorsIcon },
  { id: "permissions", label: "Permissions", Icon: PermissionsIcon },
];

const recent_items: RecentItem[] = [
  { id: "mcp", label: "MCP getting started", kind: "file" },
  { id: "teamjaecie", label: "Team Jaecie", kind: "folder" },
  { id: "teamblake", label: "Team Blake", kind: "folder" },
  { id: "retro", label: "Retrospectives", kind: "folder" },
  { id: "salesres", label: "Sales Resources", kind: "folder" },
];

const WorkspaceHome: React.FC = () => {
  const { active_item_label } = useSidebar();
  const [active_tab, setActiveTab] = useState<TabId>("recents");

  return (
    <div className="min-h-full bg-gray-50">
      {/* Cover banner — placeholder gradient, matches the approved workspace design. */}
      <div className="relative h-[170px] w-full overflow-hidden bg-[linear-gradient(115deg,#0A1717_0%,#1C2B2E_38%,#3A4A4D_60%,#D8DCDB_100%)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
        <div className="absolute right-10 top-[18px] font-mono-accent text-[11px] tracking-[0.14em] text-white/45">
        </div>
      </div>

      <div className="px-10">
        {/* Workspace header block */}
        <div className="relative flex items-start gap-[18px]">
          <div className="-mt-11 flex h-[88px] w-[88px] flex-none items-center justify-center rounded-[18px] border-[3px] border-gray-50 bg-brand-500 shadow-[0_10px_30px_rgba(10,23,23,0.28)]">
            <span className="font-outfit text-[38px] font-bold tracking-[-0.03em] text-white">
              97
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-start justify-between gap-5 pt-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-[34px] font-light tracking-[-0.01em] text-gray-700">
                  Fulfillment
                </h1>
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-gray-500 hover:bg-gray-700/[0.06]">
                  <ChevronDownIcon size={18} />
                </span>
              </div>
              <div className="mt-1 font-mono-accent text-xs tracking-[0.02em] text-gray-400">
                Fulfillment&nbsp;&nbsp;/&nbsp;&nbsp;
                <span className="font-medium text-brand-500">{active_item_label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-100"
              >
                <ChatBubbleIcon />
                Feedback
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-100"
              >
                <PersonIcon />
                Agents
              </button>
              <button
                type="button"
                className="rounded-lg bg-gray-700 px-[18px] py-2.5 text-[13px] font-semibold text-gray-50 hover:bg-gray-900"
              >
                Members
              </button>
              <button
                type="button"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                aria-label="Workspace options"
              >
                <MoreDotsIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-[26px] flex gap-1.5 border-b border-gray-200">
          {workspace_tabs.map(({ id, label, Icon }) => {
            const is_active = active_tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`-mb-px flex items-center gap-[7px] border-b-2 px-3.5 py-3 text-sm ${is_active
                    ? "border-brand-500 font-semibold text-brand-500"
                    : "border-transparent font-medium text-gray-400 hover:text-gray-700"
                  }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        {active_tab === "recents" && (
          <div className="mt-2.5 pb-[60px]">
            {recent_items.map((item, index) => (
              <div
                key={item.id}
                className={`flex cursor-pointer items-center gap-3.5 rounded-lg px-2 py-[15px] hover:bg-[#F4F4F2] ${index < recent_items.length - 1 ? "border-b border-[#ECECEA]" : ""
                  }`}
              >
                <span className="flex flex-none text-gray-400">
                  {item.kind === "file" ? <FileIcon /> : <FolderIcon size={17} />}
                </span>
                <span className="flex-1 text-[15px] font-medium text-gray-700">
                  {item.label}
                </span>
                <span className="flex flex-none text-[#C4CACB]">
                  <StarIcon size={16} />
                </span>
              </div>
            ))}
          </div>
        )}

        {active_tab === "content" && <WorkspaceContent />}

        {(active_tab === "collaborators" || active_tab === "permissions") && (
          <div className="flex items-center justify-center py-24 font-mono-accent text-[13px] tracking-[0.04em] text-gray-400">
            [ no {active_tab} yet ]
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceHome;
