"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";

export type CustomizationSectionProps = {
  admin: AdministrationManagerApi;
};

/** Administration > Customization — landing copy for the group; the actual settings live in its Branding sub-page. */
const CustomizationSection: React.FC<CustomizationSectionProps> = ({ admin }) => (
  <div className="max-w-[520px] text-[13.5px] leading-relaxed text-[#b7c0c0]">
    Personalize account-wide settings like branding and default views. Head to{" "}
    <button
      type="button"
      onClick={() => admin.selectSection("branding")}
      className="text-brand-200 hover:underline"
    >
      Branding
    </button>{" "}
    to set the account&apos;s logo and notification email header.
  </div>
);

export default CustomizationSection;
