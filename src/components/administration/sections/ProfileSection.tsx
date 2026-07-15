"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";

export type ProfileSectionProps = {
  admin: AdministrationManagerApi;
};

const inputClass =
  "w-full rounded-[9px] border border-white/[0.12] bg-[#142020] px-[13px] py-[11px] text-[14px] text-[#e9eded] outline-none focus:border-brand-500";

/** Administration > Profile — the account's display name and its URL slug. */
const ProfileSection: React.FC<ProfileSectionProps> = ({ admin }) => (
  <div className="max-w-[480px]">
    <p className="mb-7 text-[13px] leading-relaxed text-[#9aa4a5]">
      Change the account name and URL.
    </p>

    <div className="mb-5">
      <div className="mb-2 text-[13px] font-semibold text-[#d7dcdc]">Account name</div>
      <input
        type="text"
        value={admin.account_name}
        onChange={(event) => admin.setAccountName(event.target.value)}
        className={inputClass}
      />
    </div>

    <div>
      <div className="mb-2 text-[13px] font-semibold text-[#d7dcdc]">Account URL (web address)</div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={admin.account_url}
          onChange={(event) => admin.setAccountUrl(event.target.value)}
          className={inputClass}
        />
        <span className="whitespace-nowrap text-[13.5px] text-[#8a9495]">.97thfloor.app</span>
      </div>
    </div>

    <div className="mt-[22px] flex items-start gap-[10px] rounded-[9px] bg-[#579bfc]/10 px-[14px] py-3 text-[12.5px] leading-relaxed text-[#b9d4ff]">
      <svg width="15" height="15" viewBox="0 0 16 16" className="mt-[1px] flex-none text-[#7fb2ff]">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth={1.3} />
        <line x1="8" y1="7" x2="8" y2="11.2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
        <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
      </svg>
      When you change your account&apos;s URL, we&apos;ll redirect from the old one for 30 days.
    </div>

    <button
      type="button"
      className="mt-7 rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
    >
      Save changes
    </button>
  </div>
);

export default ProfileSection;
