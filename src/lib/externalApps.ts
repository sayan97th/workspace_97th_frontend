import type { ExternalProvider, ExternalService } from "@/types/external-account";

export type ExternalAppMeta = {
  id: ExternalService;
  label: string;
  provider: ExternalProvider;
  /** The integration flow is drawn in this colour, like monday.com draws Slack in aubergine. */
  brand_color: string;
  /** One line of what the integration does, for the app page banner. */
  tagline: string;
};

/** Every Gmail, Outlook and Google Calendar integration, in the order the sidebar lists them. */
export const EXTERNAL_APPS: Record<ExternalService, ExternalAppMeta> = {
  outlook: {
    id: "outlook",
    label: "Outlook",
    provider: "microsoft",
    brand_color: "#0f4a8a",
    tagline: "Turn emails into items and send emails from your own Outlook account when something changes on the board.",
  },
  gmail: {
    id: "gmail",
    label: "Gmail",
    provider: "google",
    brand_color: "#a3241d",
    tagline: "Turn emails into items and send emails from your own Gmail account when something changes on the board.",
  },
  google_calendar: {
    id: "google_calendar",
    label: "Google Calendar",
    provider: "google",
    brand_color: "#174ea6",
    tagline: "Create an event for every item and keep it in sync as dates change. Never miss a deadline.",
  },
};

export const EXTERNAL_APP_ORDER: ExternalService[] = ["outlook", "gmail", "google_calendar"];

export const PROVIDER_LABELS: Record<ExternalProvider, string> = { google: "Google", microsoft: "Microsoft" };

/** Where an administrator saves the Google and Microsoft apps. */
export const INTEGRATION_APPS_SETUP_PATH = "/administration?section=integrations";
