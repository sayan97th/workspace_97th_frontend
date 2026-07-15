"use client";
import React from "react";
import ChangePasswordSection from "@/components/admin/profile/ChangePasswordSection";
import TwoFactorSection from "@/components/user-profile/TwoFactorSection";

/**
 * My Profile > Password — hosts the existing, fully functional {@link ChangePasswordSection}
 * and {@link TwoFactorSection} unchanged (both already wired to the real profile/2FA APIs).
 * Wrapped in a `dark` scope so their `dark:` Tailwind variants stay active regardless of the
 * site-wide theme toggle, matching the modal's always-dark chrome.
 */
const PasswordSection: React.FC = () => (
  <div className="dark space-y-6">
    <ChangePasswordSection />
    <TwoFactorSection />
  </div>
);

export default PasswordSection;
