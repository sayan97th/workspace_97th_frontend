"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import SettingsRadioOption from "../SettingsRadioOption";

export type AccountSectionProps = {
  admin: AdministrationManagerApi;
};

const Heading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <>
    <div className="mb-2 text-[15px] font-bold text-[#edf1f1]">{title}</div>
    <p className="mb-4 text-[13px] leading-relaxed text-[#9aa4a5]">{description}</p>
  </>
);

/** Administration > Account — account-wide Timeline/home-page preferences. */
const AccountSection: React.FC<AccountSectionProps> = ({ admin }) => (
  <div className="max-w-[560px]">
    <Heading title="Weekends" description="This sets the first day of the work week across the Timeline." />
    <div className="mb-7 flex flex-col gap-3">
      <SettingsRadioOption
        label="Friday — Saturday"
        is_selected={admin.weekend_start === "fri_sat"}
        onSelect={() => admin.setWeekendStart("fri_sat")}
      />
      <SettingsRadioOption
        label="Saturday — Sunday"
        is_selected={admin.weekend_start === "sat_sun"}
        onSelect={() => admin.setWeekendStart("sat_sun")}
      />
    </div>

    <Heading
      title="Show weekends on the Timeline"
      description={'"Hide weekends" greys out weekends in the Timeline Column and only allows selecting work-week dates.'}
    />
    <div className="mb-7 flex flex-col gap-3">
      <SettingsRadioOption
        label="Show weekends"
        is_selected={admin.show_weekends}
        onSelect={() => admin.setShowWeekends(true)}
      />
      <SettingsRadioOption
        label="Hide weekends"
        is_selected={!admin.show_weekends}
        onSelect={() => admin.setShowWeekends(false)}
      />
    </div>

    <Heading
      title="Account home page"
      description="Set the home page for everyone in the account — the default home, or any main dashboard."
    />
    <div className="flex flex-col gap-3">
      <SettingsRadioOption
        label="Default"
        is_selected={admin.home_page === "default"}
        onSelect={() => admin.setHomePage("default")}
      />
      <SettingsRadioOption
        label="Dashboard"
        is_selected={admin.home_page === "dashboard"}
        onSelect={() => admin.setHomePage("dashboard")}
      />
    </div>
  </div>
);

export default AccountSection;
