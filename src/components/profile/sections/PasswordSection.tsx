"use client";
import React from "react";
import ChangePasswordSection from "@/components/admin/profile/ChangePasswordSection";
import TwoFactorSection from "@/components/user-profile/TwoFactorSection";

/**
 * My Profile > Password — hosts the existing, fully functional {@link ChangePasswordSection}
 * and {@link TwoFactorSection} unchanged (both already wired to the real profile/2FA APIs).
 * Styled entirely with theme-aware `shell-*` tokens, so it follows the site-wide theme
 * toggle like every other Profile/Administration section.
 */
const PasswordSection: React.FC = () => (
  <div className="space-y-6">
    <ChangePasswordSection />
    <TwoFactorSection />
  </div>
);

export default PasswordSection;
