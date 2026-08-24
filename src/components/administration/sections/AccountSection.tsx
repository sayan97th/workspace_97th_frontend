"use client";
import React from "react";
import type { AccountSettingsManagerApi } from "../useAccountSettingsManager";
import SettingsRadioOption from "../SettingsRadioOption";

export type AccountSectionProps = {
  account: AccountSettingsManagerApi;
};

const Heading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <>
    <div className="mb-2 text-[15px] font-bold text-shell-text">{title}</div>
    <p className="mb-4 text-[13px] leading-relaxed text-shell-text-muted">{description}</p>
  </>
);

/** Administration > Account — account-wide Timeline/home-page preferences. */
const AccountSection: React.FC<AccountSectionProps> = ({ account }) => {
  if (account.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading account settings…</div>;
  }

  return (
    <div className="max-w-[560px]">
      {account.preferences_save_error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {account.preferences_save_error}
        </div>
      ) : null}

      <Heading title="Weekends" description="This sets the first day of the work week across the Timeline." />
      <div className="mb-7 flex flex-col gap-3">
        <SettingsRadioOption
          label="Friday, Saturday"
          is_selected={account.weekend_start === "fri_sat"}
          onSelect={() => account.setWeekendStart("fri_sat")}
        />
        <SettingsRadioOption
          label="Saturday, Sunday"
          is_selected={account.weekend_start === "sat_sun"}
          onSelect={() => account.setWeekendStart("sat_sun")}
        />
      </div>

      <Heading
        title="Show weekends on the Timeline"
        description={'"Hide weekends" greys out weekends in the Timeline Column and only allows selecting work-week dates.'}
      />
      <div className="mb-7 flex flex-col gap-3">
        <SettingsRadioOption
          label="Show weekends"
          is_selected={account.show_weekends}
          onSelect={() => account.setShowWeekends(true)}
        />
        <SettingsRadioOption
          label="Hide weekends"
          is_selected={!account.show_weekends}
          onSelect={() => account.setShowWeekends(false)}
        />
      </div>

      <Heading
        title="Account home page"
        description="Set the home page for everyone in the account, the default home, or any main dashboard."
      />
      <div className="flex flex-col gap-3">
        <SettingsRadioOption
          label="Default"
          is_selected={account.home_page === "default"}
          onSelect={() => account.setHomePage("default")}
        />
        <SettingsRadioOption
          label="Dashboard"
          is_selected={account.home_page === "dashboard"}
          onSelect={() => account.setHomePage("dashboard")}
        />
      </div>
    </div>
  );
};

export default AccountSection;
