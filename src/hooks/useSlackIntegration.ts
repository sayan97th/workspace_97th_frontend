"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import { listenForSlackAuthorization, openSlackAuthorizationTab } from "@/lib/slackAuthorizationTab";
import { isSlackSetupError, slackNeedsSetup, slackSetupHref } from "@/lib/slackSetup";
import type { SlackAuthorizationMessage, SlackAuthorizationPurpose, SlackStatusDto } from "@/types/slack";

export type SlackIntegrationApi = {
  status: SlackStatusDto | null;
  is_loading: boolean;
  /** True while a connect, disconnect or test request is in flight. */
  is_working: boolean;
  /** True while a Slack authorization tab is open and has not reported back yet. */
  is_awaiting_slack: boolean;
  /** Which flow the open Slack tab is for, so only the matching card says it is waiting. */
  awaiting_purpose: SlackAuthorizationPurpose | null;
  /** Stops waiting for the Slack tab, for when the person closed it without finishing. */
  cancelAwaitingSlack: () => void;
  /** Changes every time a Slack authorization finishes, so other hooks can reload their data. */
  completed_at: number;
  error: string | null;
  notice: string | null;
  dismissMessages: () => void;
  /** Shows a message in the shared banner, for actions run by other hooks of the same screen. */
  reportError: (message: string) => void;
  reportNotice: (message: string) => void;
  /** Applies a status the API answered with after an action elsewhere, for example switching workspaces. */
  applyStatus: (status: SlackStatusDto, notice?: string) => void;
  reloadStatus: () => Promise<void>;
  /** Opens "Add to Slack" in a new tab, to add a workspace or reconnect one. `return_path` is only used when the tab was blocked. */
  connectWorkspace: (return_path?: string) => Promise<void>;
  disconnectWorkspace: () => Promise<void>;
  /**
   * Opens "Connect my Slack" in a new tab, pinned to the active workspace. While Slack still needs
   * its one time setup, administrators are sent to Administration > Integrations > Slack instead
   * and everyone else is told to ask one.
   */
  connectMyAccount: (return_path?: string) => Promise<void>;
  disconnectMyAccount: () => Promise<void>;
  sendTestMessage: () => Promise<void>;
};

/** Plain language for the `reason` the API's OAuth callback reports. */
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Slack authorization was cancelled, nothing was changed.",
  forbidden: "Only administrators and the account owner can connect a Slack workspace.",
  invalid_state: "The Slack connection request expired. Please try again.",
  not_installed: "Slack is not connected to this account yet.",
  not_configured: "Slack is not configured yet. Add the Slack app credentials in Administration > Integrations > Slack.",
  bad_client_secret: "Slack rejected the client secret. Check it in Administration > Integrations > Slack.",
  invalid_client_id: "Slack does not recognize the client ID. Check it in Administration > Integrations > Slack.",
  bad_redirect_uri: "The redirect URL is not registered in the Slack app under OAuth & Permissions.",
  invalid_team_for_non_distributed_app:
    "This Slack app can only be installed in the workspace it was created in. Turn on public distribution in the Slack app under Manage Distribution, then try again.",
};

/**
 * How long to wait for the Slack tab before giving up, the same 10 minutes the API keeps the
 * OAuth state. The opened tab cannot be watched instead: Slack's pages cut the link to the tab
 * that opened them (Cross-Origin-Opener-Policy), so `tab.closed` turns true as soon as Slack loads.
 */
const AWAIT_SLACK_TIMEOUT_MS = 10 * 60 * 1000;

export const slackCallbackErrorMessage = (reason: string | null, workspace_name?: string | null): string => {
  if (reason === "wrong_workspace") {
    return workspace_name
      ? `That Slack account is not part of ${workspace_name}. Sign in to ${workspace_name} on the Slack page, or ask an administrator to switch the active Slack workspace.`
      : "That Slack account belongs to a different workspace than the one connected here.";
  }

  return (reason && CALLBACK_ERROR_MESSAGES[reason]) || "Slack could not be connected. Please try again.";
};

const successNotice = (message: Pick<SlackAuthorizationMessage, "purpose" | "workspace" | "matched">): string => {
  if (message.purpose === "link") return "Your Slack account is connected.";
  if (message.purpose === "connect") return message.workspace ? `Your ${message.workspace} Slack account is connected.` : "Your Slack account is connected.";

  const workspace = message.workspace ? `${message.workspace} is connected and active.` : "Slack connected successfully.";
  if (message.matched === null || message.matched === undefined) return workspace;

  return message.matched === 1
    ? `${workspace} 1 member was matched to their Slack account by email.`
    : `${workspace} ${message.matched} members were matched to their Slack account by email.`;
};

/**
 * State and actions for the Slack integration, shared by Administration > Integrations > Slack
 * (set up the app, connect and switch workspaces), My Profile > Notifications (link a personal account) and
 * the board Integrations dialog.
 *
 * Slack always opens in a new tab, like monday.com, so the workspace is never replaced. The
 * tab finishes on `/integrations/slack/complete`, which broadcasts the result back here and
 * closes itself. A flow that came back to this tab instead (`?slack=connected` or
 * `?slack=error&reason=...`) is still understood, and the two params are stripped so a refresh
 * does not show the message again.
 */
export function useSlackIntegration(): SlackIntegrationApi {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();

  const [status, setStatus] = useState<SlackStatusDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_working, setIsWorking] = useState(false);
  const [awaiting_purpose, setAwaitingPurpose] = useState<SlackAuthorizationPurpose | null>(null);
  const [completed_at, setCompletedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handled_callback_ref = useRef(false);
  const await_timer_ref = useRef<number | null>(null);
  const status_ref = useRef<SlackStatusDto | null>(null);

  useEffect(() => {
    status_ref.current = status;
  }, [status]);

  const reloadStatus = useCallback(async () => {
    try {
      setStatus(await slackService.getStatus());
    } catch (failure) {
      setError(apiErrorMessage(failure, "Failed to load the Slack connection."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    slackService
      .getStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "Failed to load the Slack connection."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stopWatchingTab = useCallback(() => {
    if (await_timer_ref.current !== null) {
      window.clearTimeout(await_timer_ref.current);
      await_timer_ref.current = null;
    }
    setAwaitingPurpose(null);
  }, []);

  useEffect(() => stopWatchingTab, [stopWatchingTab]);

  useEffect(
    () =>
      listenForSlackAuthorization((message) => {
        stopWatchingTab();
        setCompletedAt(Date.now());

        if (message.result === "connected") {
          setError(null);
          setNotice(successNotice(message));
        } else {
          setNotice(null);
          setError(slackCallbackErrorMessage(message.reason, status_ref.current?.workspace?.team_name));
        }

        void reloadStatus();
      }),
    [reloadStatus, stopWatchingTab]
  );

  useEffect(() => {
    const result = search_params.get("slack");
    if (!result || handled_callback_ref.current) return;
    handled_callback_ref.current = true;

    if (result === "connected") {
      setNotice(successNotice({ purpose: null, workspace: null, matched: null }));
    } else {
      setError(slackCallbackErrorMessage(search_params.get("reason")));
    }

    const next_params = new URLSearchParams(search_params.toString());
    next_params.delete("slack");
    next_params.delete("reason");
    const query = next_params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [search_params, pathname, router]);

  const dismissMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const reportError = useCallback((message: string) => {
    setNotice(null);
    setError(message);
  }, []);

  const reportNotice = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);

  const applyStatus = useCallback((next_status: SlackStatusDto, next_notice?: string) => {
    setStatus(next_status);
    setError(null);
    if (next_notice) setNotice(next_notice);
  }, []);

  /** Runs `action`, reporting its failure as `error` and toggling `is_working` around it. */
  const run = useCallback(async (action: () => Promise<void>, fallback_message: string) => {
    setIsWorking(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (failure) {
      setError(apiErrorMessage(failure, fallback_message));
    } finally {
      setIsWorking(false);
    }
  }, []);

  /** Opens the Slack URL in a new tab and waits for it to report back. */
  const authorizeInNewTab = useCallback(
    (purpose: SlackAuthorizationPurpose, requestUrl: () => Promise<string>) =>
      run(async () => {
        stopWatchingTab();
        const tab = await openSlackAuthorizationTab(requestUrl);
        if (!tab) return;

        setAwaitingPurpose(purpose);
        await_timer_ref.current = window.setTimeout(stopWatchingTab, AWAIT_SLACK_TIMEOUT_MS);
      }, "Failed to start the Slack connection."),
    [run, stopWatchingTab]
  );

  const connectWorkspace = useCallback(
    (return_path?: string) => authorizeInNewTab("install", () => slackService.requestInstallUrl(return_path, "tab")),
    [authorizeInNewTab]
  );

  const disconnectWorkspace = useCallback(
    () =>
      run(async () => {
        const response = await slackService.disconnectWorkspace();
        setStatus(response);
        setCompletedAt(Date.now());
        setNotice(response.message);
      }, "Failed to disconnect Slack."),
    [run]
  );

  /** Sends administrators to the Slack setup page, tells everyone else who can finish it. */
  const redirectToSetup = useCallback(() => {
    if (status_ref.current?.can_configure_app) {
      router.push(slackSetupHref("connect"));
      return;
    }

    setNotice(null);
    setError("Slack is not set up for this account yet. Ask an administrator or the account owner to set it up in Administration > Integrations > Slack.");
  }, [router]);

  const connectMyAccount = useCallback(
    async (return_path?: string) => {
      if (slackNeedsSetup(status_ref.current)) {
        redirectToSetup();
        return;
      }

      setIsWorking(true);
      setError(null);
      setNotice(null);
      try {
        stopWatchingTab();
        const tab = await openSlackAuthorizationTab(() => slackService.requestLinkUrl(return_path, "tab"));
        if (!tab) return;

        setAwaitingPurpose("link");
        await_timer_ref.current = window.setTimeout(stopWatchingTab, AWAIT_SLACK_TIMEOUT_MS);
      } catch (failure) {
        // The setup was removed since the status loaded, refresh it so every card shows the right state.
        if (isSlackSetupError(failure)) {
          void reloadStatus();
          redirectToSetup();
        } else {
          setError(apiErrorMessage(failure, "Failed to start the Slack connection."));
        }
      } finally {
        setIsWorking(false);
      }
    },
    [redirectToSetup, reloadStatus, stopWatchingTab]
  );

  const disconnectMyAccount = useCallback(
    () =>
      run(async () => {
        setStatus(await slackService.unlinkMyAccount());
        setNotice("Your Slack account was disconnected.");
      }, "Failed to disconnect your Slack account."),
    [run]
  );

  const sendTestMessage = useCallback(
    () =>
      run(async () => {
        const response = await slackService.sendTestMessage();
        setNotice(response.message);
      }, "Failed to send the test message."),
    [run]
  );

  return {
    status,
    is_loading,
    is_working,
    is_awaiting_slack: awaiting_purpose !== null,
    awaiting_purpose,
    cancelAwaitingSlack: stopWatchingTab,
    completed_at,
    error,
    notice,
    dismissMessages,
    reportError,
    reportNotice,
    applyStatus,
    reloadStatus,
    connectWorkspace,
    disconnectWorkspace,
    connectMyAccount,
    disconnectMyAccount,
    sendTestMessage,
  };
}
