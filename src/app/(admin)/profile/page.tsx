import type { Metadata } from "next";
import ProfileView from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "My Profile | Workspace 97th",
  description: "Manage your personal information, working status, notifications and security settings",
};

export default function ProfilePage() {
  return <ProfileView />;
}
