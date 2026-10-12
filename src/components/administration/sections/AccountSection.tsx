"use client";
import React from "react";
import type { AccountSettingsManagerApi } from "../useAccountSettingsManager";
import SettingsRadioOption from "../SettingsRadioOption";

export type AccountSectionProps = {
  account: AccountSettingsManagerApi;
};

const SettingGroup: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="border-b border-shell-border py-6 first:pt-0 last:border-b-0">
    <h3 className="admin-group-title !mb-1">{title}</h3>
    <p className="mb-4 text-[14px] leading-5 text-shell-text-secondary">{description}</p>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
);

/** Administration > General > Account: account wide work week, Timeline and home page preferences, saved on change. */
const AccountSection: React.FC<AccountSectionProps> = ({ account }) => {
  if (account.is_loading) {
    return <div className="text-[14px] text-shell-text-faint">Loading account settings…</div>;
  }

  return (
    <div className="max-w-[640px]">
      {account.preferences_save_error ? (
        <div role="alert" className="admin-notice admin-notice-error mb-5">
          {account.preferences_save_error}
        </div>
      ) : null}

      <SettingGroup title="Weekends" description="This sets the first day of the work week across the Timeline.">
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
      </SettingGroup>

      <SettingGroup
        title="Show weekends on the Timeline"
        description={'"Hide weekends" greys out weekends in the Timeline column and only allows selecting work week dates.'}
      >
        <SettingsRadioOption label="Show weekends" is_selected={account.show_weekends} onSelect={() => account.setShowWeekends(true)} />
        <SettingsRadioOption label="Hide weekends" is_selected={!account.show_weekends} onSelect={() => account.setShowWeekends(false)} />
      </SettingGroup>

      <SettingGroup
        title="Account home page"
        description="Set the home page for everyone in the account, the default home, or any main dashboard."
      >
        <SettingsRadioOption label="Default" is_selected={account.home_page === "default"} onSelect={() => account.setHomePage("default")} />
        <SettingsRadioOption
          label="Dashboard"
          is_selected={account.home_page === "dashboard"}
          onSelect={() => account.setHomePage("dashboard")}
        />
      </SettingGroup>
    </div>
  );
};

export default AccountSection;
