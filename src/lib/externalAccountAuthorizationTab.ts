import type { ExternalAuthorizationMessage } from "@/types/external-account";

/** BroadcastChannel the completion tab uses to tell every open tab how a Gmail, Outlook or Google Calendar connection went. */
export const EXTERNAL_AUTHORIZATION_CHANNEL = "external_account_authorization";

/**
 * Opens the provider's consent page in a new tab, the same way `openSlackAuthorizationTab` does:
 * the tab is opened inside the click (browsers block it after an `await`), shows a short wait
 * message until the API answers with the URL, then goes there. When the browser blocked the tab
 * anyway, the current tab goes instead.
 */
export async function openExternalAuthorizationTab(app_label: string, requestUrl: () => Promise<string>): Promise<Window | null> {
  const tab = window.open("", "_blank");

  if (tab) {
    try {
      tab.document.title = `Connecting to ${app_label}`;
      tab.document.body.style.cssText = "font-family: system-ui, sans-serif; color: #676879; display: grid; place-items: center; min-height: 90vh;";
      tab.document.body.textContent = `Opening ${app_label}…`;
    } catch {
      // Some browsers do not expose the blank document, the tab still works.
    }
  }

  let url: string;
  try {
    url = await requestUrl();
  } catch (failure) {
    tab?.close();
    throw failure;
  }

  if (tab && !tab.closed) {
    tab.location.href = url;
    return tab;
  }

  window.location.href = url;
  return null;
}

/** Tells the tab that started the connection how it went. */
export function announceExternalAuthorization(message: ExternalAuthorizationMessage): boolean {
  if (typeof BroadcastChannel === "undefined") return false;

  const channel = new BroadcastChannel(EXTERNAL_AUTHORIZATION_CHANNEL);
  channel.postMessage(message);
  channel.close();
  return true;
}

/** Calls `onMessage` whenever a connection finishes in another tab. Returns the unsubscribe function. */
export function listenForExternalAuthorization(onMessage: (message: ExternalAuthorizationMessage) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;

  const channel = new BroadcastChannel(EXTERNAL_AUTHORIZATION_CHANNEL);
  channel.onmessage = (event: MessageEvent<ExternalAuthorizationMessage>) => {
    if (event.data?.type === "external_account_authorization_complete") onMessage(event.data);
  };

  return () => channel.close();
}

/** The person facing explanation of a callback `reason`. */
export function externalAuthorizationErrorMessage(reason: string | null | undefined, app_label = "the app"): string {
  switch (reason) {
    case "access_denied":
      return `The connection to ${app_label} was cancelled.`;
    case "invalid_state":
      return "The connection request expired. Please try again.";
    case "missing_scopes":
      return `${app_label} needs every permission on the consent screen. Connect again and leave all of them checked.`;
    case "forbidden":
      return "You do not have permission to connect integrations. Ask an account administrator.";
    case "not_configured":
      return `${app_label} is not set up yet. Ask an account administrator to set it up in Administration > Integrations.`;
    case "invalid_client":
    case "unauthorized_client":
      return "The app rejected its client id or secret. Ask an administrator to check them in Administration > Integrations.";
    case "redirect_uri_mismatch":
      return "The redirect URL is not registered in the app. Ask an administrator to copy it from Administration > Integrations.";
    default:
      return `${app_label} could not be connected. Please try again.`;
  }
}
