import ProfileForm from "@/components/user-profile/ProfileForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Profile | Workspace 97th",
  description: "Manage your account profile, security and preferences.",
};

export default function Profile() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <ProfileForm />
      </div>
    </div>
  );
}
