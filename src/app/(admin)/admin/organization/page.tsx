import { redirect } from "next/navigation";
import { ORGANIZATION_SETTINGS_PATH } from "@/components/organization/organization-routes";

/** Organization is a section of the Administration view now, old links and bookmarks land there. */
export default function OrganizationPage() {
  redirect(ORGANIZATION_SETTINGS_PATH);
}
