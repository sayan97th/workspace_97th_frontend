import type { Metadata } from "next";
import UsersDirectoryView from "@/components/users-directory/UsersDirectoryView";

export const metadata: Metadata = {
  title: "Manage users",
  description: "Every account on this site, with their role, department and status, and the actions to manage them",
};

export default function UsersPage() {
  return <UsersDirectoryView />;
}
