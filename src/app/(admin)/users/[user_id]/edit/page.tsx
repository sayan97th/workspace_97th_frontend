import type { Metadata } from "next";
import EditUserView from "@/components/users-directory/EditUserView";

export const metadata: Metadata = {
  title: "Edit User | Workspace 97th",
  description: "Edit an account's name, email, phone and department",
};

export default async function EditUserPage({ params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params;
  return <EditUserView user_id={user_id} />;
}
