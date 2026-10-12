import { redirect } from "next/navigation";
import { SLACK_SETUP_PATH } from "@/lib/slackSetup";

type SlackSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Slack settings is a section of the Administration view now. Old links, bookmarks and Slack OAuth
 * flows started before the move land there, keeping their query (`reason`, `slack`) so the
 * section still shows why the person was sent there or how the Slack flow ended.
 */
export default async function SlackSettingsPage({ searchParams }: SlackSettingsPageProps) {
  const forwarded_params = new URLSearchParams();
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (key === "section" || value === undefined) return;
    (Array.isArray(value) ? value : [value]).forEach((entry) => forwarded_params.append(key, entry));
  });

  const forwarded_query = forwarded_params.toString();
  redirect(forwarded_query ? `${SLACK_SETUP_PATH}&${forwarded_query}` : SLACK_SETUP_PATH);
}
