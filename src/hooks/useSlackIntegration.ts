"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type { SlackStatusDto } from "@/types/slack";

export type SlackIntegrationApi = {
  status: SlackStatusDto | null;
  is_loading: boolean;
  /** True while a connect, disconnect or test request is in flight. */
  is_working: boolean;
  error: string | null;
  notice: string | null;
  dismissMessages: () => void;
  /** `return_path` is where Slack sends the browser back to, defaults to Administration. */
  connectWorkspace: (return_path?: string) => Promise<void>;
  disconnectWorkspace: () => Promise<void>;
  /** `return_path` is where Slack sends the browser back to, defaults to My Profile. */
  connectMyAccount: (return_path?: string) => Promise<void>;
  disconnectMyAccount: () => Promise<void>;
  sendTestMessage: () => Promise<void>;
};

/** Plain language for the `reason` the API's OAuth callback redirects back with. */
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Slack authorization was cancelled, nothing was changed.",
  forbidden: "Only administrators can connect a Slack workspace.",
  invalid_state: "The Slack connection request expired. Please try again.",
  wrong_workspace: "That Slack account belongs to a different workspace than the one connected here.",
  not_installed: "Slack is not connected to this account yet.",
  not_configured: "Slack is not configured on this server yet.",
};

const callbackErrorMessage = (reason: string | null): string =>
  (reason && CALLBACK_ERROR_MESSAGES[reason]) || "Slack could not be connected. Please try again.";

/**
 * State and actions for the Slack integration, shared by Administration > Integrations
 * (install the workspace) and My Profile > Notifications (link a personal account).
 *
 * When Slack redirects the browser back into the app the URL carries `?slack=connected` or
 * `?slack=error&reason=...`, this hook turns that into a notice or error message and strips
 * the two params so a refresh does not show the message again.
 */
export function useSlackIntegration(): SlackIntegrationApi {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();

  const [status, setStatus] = useState<SlackStatusDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_working, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handled_callback_ref = useRef(false);

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

  useEffect(() => {
    const result = search_params.get("slack");
    if (!result || handled_callback_ref.current) return;
    handled_callback_ref.current = true;

    if (result === "connected") {
      setNotice("Slack connected successfully.");
    } else {
      setError(callbackErrorMessage(search_params.get("reason")));
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

  const connectWorkspace = useCallback(
    (return_path?: string) =>
      run(async () => {
        window.location.href = await slackService.requestInstallUrl(return_path);
      }, "Failed to start the Slack connection."),
    [run]
  );

  const disconnectWorkspace = useCallback(
    () =>
      run(async () => {
        setStatus(await slackService.disconnectWorkspace());
        setNotice("Slack disconnected. Automations that post to Slack were switched off.");
      }, "Failed to disconnect Slack."),
    [run]
  );

  const connectMyAccount = useCallback(
    (return_path?: string) =>
      run(async () => {
        window.location.href = await slackService.requestLinkUrl(return_path);
      }, "Failed to start the Slack connection."),
    [run]
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
    error,
    notice,
    dismissMessages,
    connectWorkspace,
    disconnectWorkspace,
    connectMyAccount,
    disconnectMyAccount,
    sendTestMessage,
  };
}
