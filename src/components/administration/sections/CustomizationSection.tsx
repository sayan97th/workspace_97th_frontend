"use client";
import React from "react";

export type CustomizationSectionProps = {
  onGoToBranding: () => void;
};

/** Administration > Customization — landing copy for the group; the actual settings live in its Branding sub-page. */
const CustomizationSection: React.FC<CustomizationSectionProps> = ({ onGoToBranding }) => (
  <div className="max-w-[520px] text-[13.5px] leading-relaxed text-shell-text-secondary">
    Personalize account-wide settings like branding and default views. Head to{" "}
    <button type="button" onClick={onGoToBranding} className="text-brand-200 hover:underline">
      Branding
    </button>{" "}
    to set the account&apos;s logo and notification email header.
  </div>
);

export default CustomizationSection;
