"use client";
import React from "react";
import Link from "next/link";
import { ORGANIZATION_SETTINGS_PATH } from "@/components/organization/organization-routes";

export type CustomizationSectionProps = {
  onGoToBranding: () => void;
};

/** Administration > Customization, landing copy for the group. The settings live on the Organization page and the Branding sub page. */
const CustomizationSection: React.FC<CustomizationSectionProps> = ({ onGoToBranding }) => (
  <div className="max-w-[520px] text-[13.5px] leading-relaxed text-shell-text-secondary">
    Personalize account wide settings like branding and default views. Head to{" "}
    <Link href={ORGANIZATION_SETTINGS_PATH} className="text-brand-500 hover:underline">
      Organization
    </Link>{" "}
    for the company profile, logo, favicon, brand color and announcements, or to{" "}
    <button type="button" onClick={onGoToBranding} className="text-brand-500 hover:underline">
      Branding
    </button>{" "}
    for the notification email header.
  </div>
);

export default CustomizationSection;
