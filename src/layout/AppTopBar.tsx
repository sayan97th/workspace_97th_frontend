"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import RequestAccessModal, {
  type RequestAccessSubmission,
} from "./RequestAccessModal";
import {
  AppsGridIcon,
  BellIcon,
  EyeIcon,
  FeedIcon,
  HamburgerIcon,
  HelpIcon,
  InviteIcon,
  PersonIcon,
  SearchIcon,
} from "./workspace-icons";

/**
 * Full-width dark application bar that sits above the sidebar and main content.
 * Mirrors the "top application bar" from the approved 97 Workspace design.
 */
const AppTopBar: React.FC = () => {
  const { toggleMobileSidebar } = useSidebar();
  const { logout } = useAuth();
  const [is_account_open, setIsAccountOpen] = useState(false);
  const [is_request_access_open, setIsRequestAccessOpen] = useState(false);

  const openRequestAccess = () => setIsRequestAccessOpen(true);
  const closeRequestAccess = () => setIsRequestAccessOpen(false);

  const handleRequestAccessSubmit = (submission: RequestAccessSubmission) => {
    // No backend wiring yet — surface the payload for the future API hook.
    console.log("Request edit access submitted", submission);
  };

  const toggleAccount = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsAccountOpen((prev) => !prev);
  };

  const closeAccount = () => setIsAccountOpen(false);

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      closeAccount();
    }
  };

  const icon_button_class =
    "relative flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#C2CACB] transition-colors hover:bg-white/[0.08]";

  return (
    <>
    <header className="relative z-[60] flex h-[52px] flex-none items-center gap-3.5 border-b border-white/[0.06] bg-gray-700 px-3.5 text-[#E9EDED]">
      {/* Left cluster */}
      <div className="flex flex-none items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#C2CACB] hover:bg-white/[0.08] lg:hidden"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon size={18} />
        </button>

        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-brand-500 text-[13px] font-bold tracking-[-0.02em] text-white">
          97
        </span>

        <span className="hidden items-center gap-1.5 rounded-lg bg-white/[0.08] px-[11px] py-1.5 text-[13px] font-semibold text-[#C7D0D0] sm:flex">
          <EyeIcon size={15} />
          Viewer
        </span>

        <button
          type="button"
          onClick={openRequestAccess}
          className="hidden rounded-lg border border-white/[0.14] px-[13px] py-1.5 text-[13px] font-semibold text-[#E9EDED] transition-colors hover:border-brand-500 hover:text-white md:block"
        >
          Request edit access
        </button>
      </div>

      {/* Center search */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          className="flex w-full max-w-[520px] cursor-text items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.07] px-3.5 py-2 text-left text-[#8A9495] transition-colors hover:bg-white/[0.12]"
        >
          <SearchIcon size={15} />
          <span className="text-[13.5px]">Search for anything...</span>
        </button>
      </div>

      {/* Right cluster */}
      <div className="flex flex-none items-center gap-0.5">
        <button type="button" className={icon_button_class} aria-label="Notifications">
          <BellIcon size={17} />
          <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-gray-700 bg-brand-500" />
        </button>

        <button type="button" className={icon_button_class} aria-label="Update feed">
          <FeedIcon size={17} />
          <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-lg border-[1.5px] border-gray-700 bg-brand-500 px-[3px] text-[9.5px] font-bold text-white">
            8
          </span>
        </button>

        <button type="button" className={icon_button_class} aria-label="Invite members">
          <InviteIcon size={17} />
        </button>

        <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="Help">
          <HelpIcon size={17} />
        </button>

        <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="Apps">
          <AppsGridIcon size={16} />
        </button>

        <div className="relative ml-1.5">
          <button
            type="button"
            onClick={toggleAccount}
            className="dropdown-toggle flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border-2 border-transparent bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[11px] font-bold text-white transition-colors hover:border-white/35"
            aria-label="Account"
          >
            JM
          </button>
          <Dropdown
            isOpen={is_account_open}
            onClose={closeAccount}
            className="w-[180px] !border-white/10 !bg-[#0F1C1C] p-1.5 shadow-theme-lg"
          >
            <DropdownItem
              tag="a"
              href="/profile"
              baseClassName=""
              onItemClick={closeAccount}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-theme-sm font-medium !text-gray-100 hover:bg-white/[0.08]"
            >
              <PersonIcon size={16} />
              View profile
            </DropdownItem>
            <DropdownItem
              tag="button"
              baseClassName=""
              onItemClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-theme-sm font-medium !text-gray-100 hover:bg-white/[0.08]"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15M10 17L15 12M15 12L10 7M15 12H3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Sign out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>

      <RequestAccessModal
        is_open={is_request_access_open}
        onClose={closeRequestAccess}
        onSubmit={handleRequestAccessSubmit}
      />
    </>
  );
};

export default AppTopBar;
