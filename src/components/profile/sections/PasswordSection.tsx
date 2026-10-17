"use client";
import React from "react";
import ChangePasswordSection from "@/components/admin/profile/ChangePasswordSection";
import TwoFactorSection from "@/components/user-profile/TwoFactorSection";

/**
 * My Profile > Password, hosts the fully functional {@link ChangePasswordSection} and
 * {@link TwoFactorSection} (both wired to the real profile and 2FA APIs) as two framed cards,
 * styled through the shared `profileStyles` recipes.
 */
const PasswordSection: React.FC = () => (
  <div className="space-y-6">
    <ChangePasswordSection />
    <TwoFactorSection />
  </div>
);

export default PasswordSection;
