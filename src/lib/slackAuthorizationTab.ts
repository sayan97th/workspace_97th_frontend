import type { SlackAuthorizationMessage } from "@/types/slack";

/** BroadcastChannel the completion tab uses to tell every open tab of the app how the Slack authorization went. */
export const SLACK_AUTHORIZATION_CHANNEL = "slack_authorization";

/**
 * Opens a Slack authorization in a new tab, so the workspace stays open where it was.
 *
 * The tab is opened right away, still inside the click, because browsers block a tab opened
 * after an `await`. It shows a short wait message until the API answers with the Slack URL,
 * then goes to Slack. When the browser blocked the tab anyway, the current tab goes to Slack
 * instead and the completion page offers the way back.
 */
export async function openSlackAuthorizationTab(requestUrl: () => Promise<string>): Promise<Window | null> {
  const tab = window.open("", "_blank");

  if (tab) {
    try {
      tab.document.title = "Connecting to Slack";
      tab.document.body.style.cssText = "font-family: system-ui, sans-serif; color: #676879; display: grid; place-items: center; min-height: 90vh;";
      tab.document.body.textContent = "Opening Slack…";
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

/** Tells the tab that started the authorization how it went, then lets the caller close this tab. */
export function announceSlackAuthorization(message: SlackAuthorizationMessage): boolean {
  if (typeof BroadcastChannel === "undefined") return false;

  const channel = new BroadcastChannel(SLACK_AUTHORIZATION_CHANNEL);
  channel.postMessage(message);
  channel.close();
  return true;
}

/** Calls `onMessage` whenever a Slack authorization finishes in another tab. Returns the unsubscribe function. */
export function listenForSlackAuthorization(onMessage: (message: SlackAuthorizationMessage) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;

  const channel = new BroadcastChannel(SLACK_AUTHORIZATION_CHANNEL);
  channel.onmessage = (event: MessageEvent<SlackAuthorizationMessage>) => {
    if (event.data?.type === "slack_authorization_complete") onMessage(event.data);
  };

  return () => channel.close();
}
