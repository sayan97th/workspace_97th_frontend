"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ClockIcon,
  CollaboratorsIcon,
  ContentTabIcon,
  HamburgerIcon,
  MoreDotsIcon,
  PermissionsIcon,
  PersonIcon,
} from "./workspace-icons";

type TabId = "recents" | "content" | "collaborators" | "permissions";

type TabDefinition = {
  id: TabId;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

const workspace_tabs: TabDefinition[] = [
  { id: "recents", label: "Recents", Icon: ClockIcon },
  { id: "content", label: "Content", Icon: ContentTabIcon },
  { id: "collaborators", label: "Collaborators", Icon: CollaboratorsIcon },
  { id: "permissions", label: "Permissions", Icon: PermissionsIcon },
];

const AppHeader: React.FC = () => {
  const { toggleMobileSidebar, active_item_label } = useSidebar();
  const { logout } = useAuth();
  const [active_tab, setActiveTab] = useState<TabId>("recents");
  const [is_menu_open, setIsMenuOpen] = useState(false);

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      closeMenu();
    }
  };

  return (
    <div className="flex-none">
      {/* Cover banner — placeholder gradient, matches the approved mockup exactly. */}
      <div className="relative h-[170px] w-full overflow-hidden bg-[linear-gradient(115deg,#0A1717_0%,#1C2B2E_38%,#3A4A4D_60%,#D8DCDB_100%)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
        <div className="absolute right-10 top-[18px] font-mono-accent text-[11px] tracking-[0.14em] text-white/45">
          [ workspace cover ]
        </div>
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon size={20} />
        </button>
      </div>

      <div className="px-10">
        <div className="relative -mt-11 flex items-end gap-[18px]">
          <div className="flex h-[88px] w-[88px] flex-none items-center justify-center rounded-[18px] border-[3px] border-gray-50 bg-brand-500 shadow-[0_10px_30px_rgba(10,23,23,0.28)]">
            <span className="font-outfit text-[38px] font-bold tracking-[-0.03em] text-white">
              97
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-end justify-between gap-5 pb-1.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-[34px] font-light tracking-[-0.01em] text-gray-900">
                  Fulfillment
                </h1>
                <ChevronDownIcon size={18} className="text-gray-500" />
              </div>
              <div className="mt-1 font-mono-accent text-xs tracking-[0.02em] text-gray-400">
                Fulfillment&nbsp;&nbsp;/&nbsp;&nbsp;
                <span className="font-medium text-brand-500">{active_item_label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
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
                className="rounded-lg bg-gray-900 px-[18px] py-2.5 text-[13px] font-semibold text-gray-50 hover:bg-black"
              >
                Members
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={toggleMenu}
                  className="dropdown-toggle flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                  aria-label="More options"
                >
                  <MoreDotsIcon size={16} />
                </button>
                <Dropdown
                  isOpen={is_menu_open}
                  onClose={closeMenu}
                  className="w-[180px] !border-white/10 !bg-gray-900 p-1.5 shadow-theme-lg"
                >
                  <DropdownItem
                    tag="button"
                    baseClassName=""
                    onItemClick={handleSignOut}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-theme-sm font-medium !text-gray-100 hover:bg-white/[0.08]"
                  >
                    Sign out
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — only "Recents" drives visible content today; the rest are placeholder views. */}
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
                    : "border-transparent font-medium text-gray-400 hover:text-gray-900"
                  }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppHeader;
