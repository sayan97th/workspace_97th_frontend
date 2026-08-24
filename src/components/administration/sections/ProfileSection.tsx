"use client";
import React from "react";
import type { AccountSettingsManagerApi } from "../useAccountSettingsManager";

export type ProfileSectionProps = {
  account: AccountSettingsManagerApi;
};

const inputClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[11px] text-[14px] text-shell-text outline-none focus:border-brand-500";

/** Administration > Profile — the account's display name and its URL slug. */
const ProfileSection: React.FC<ProfileSectionProps> = ({ account }) => {
  if (account.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading account settings…</div>;
  }

  return (
    <div className="max-w-[480px]">
      <p className="mb-7 text-[13px] leading-relaxed text-shell-text-muted">
        Change the account name and URL.
      </p>

      <div className="mb-5">
        <div className="mb-2 text-[13px] font-semibold text-shell-text-secondary">Account name</div>
        <input
          type="text"
          value={account.account_name}
          onChange={(event) => account.setAccountName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <div className="mb-2 text-[13px] font-semibold text-shell-text-secondary">Account URL (web address)</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={account.account_url}
            onChange={(event) => account.setAccountUrl(event.target.value)}
            className={inputClass}
          />
          <span className="whitespace-nowrap text-[13.5px] text-shell-text-muted">.97thfloor.app</span>
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

      {account.profile_save_error ? (
        <div className="mt-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {account.profile_save_error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void account.saveProfile()}
        disabled={!account.has_unsaved_profile_changes || account.is_saving_profile}
        className="mt-7 rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
      >
        {account.is_saving_profile ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
};

export default ProfileSection;
