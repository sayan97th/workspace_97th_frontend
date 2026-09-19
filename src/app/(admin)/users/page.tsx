import type { Metadata } from "next";
import UsersDirectoryView from "@/components/users-directory/UsersDirectoryView";

export const metadata: Metadata = {
  title: "Users",
  description: "Browse every account registered on this site, with their email and site-wide role",
};

export default function UsersPage() {
  return <UsersDirectoryView />;
}
