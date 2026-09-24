"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type { SlackRecipientDto } from "@/types/slack";

export type SlackUserNotificationApi = {
  recipients: SlackRecipientDto[];
  is_loading_recipients: boolean;
  is_sending: boolean;
  send_error: string | null;
  send_notice: string | null;
  sendNotification: (user_id: number, message: string) => Promise<boolean>;
  dismissMessages: () => void;
};

/**
 * State for the "Notify a member" test on /admin/test/slack. Loads the members who linked their
 * Slack account once a working bot token is confirmed, and reloads them on every diagnostics run
 * (`reload_key`) so someone who just linked their account shows up without a page refresh.
 */
export function useSlackUserNotification(is_enabled: boolean, reload_key: string | null): SlackUserNotificationApi {
  const [recipients, setRecipients] = useState<SlackRecipientDto[]>([]);
  const [is_loading_recipients, setIsLoadingRecipients] = useState(false);
  const [is_sending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_notice, setSendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!is_enabled) {
      setRecipients([]);
      return;
    }

    let cancelled = false;
    setIsLoadingRecipients(true);

    slackService
      .getNotificationRecipients()
      .then((data) => {
        if (!cancelled) setRecipients(data);
      })
      .catch((failure) => {
        if (!cancelled) setSendError(apiErrorMessage(failure, "Failed to load the Slack members."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecipients(false);
      });

    return () => {
      cancelled = true;
    };
  }, [is_enabled, reload_key]);

  const sendNotification = useCallback(async (user_id: number, message: string) => {
    setIsSending(true);
    setSendError(null);
    setSendNotice(null);
    try {
      const response = await slackService.sendUserTestNotification(user_id, message);
      setSendNotice(response.message);
      return true;
    } catch (failure) {
      setSendError(apiErrorMessage(failure, "Failed to send the Slack notification."));
      return false;
    } finally {
      setIsSending(false);
    }
  }, []);

  const dismissMessages = useCallback(() => {
    setSendError(null);
    setSendNotice(null);
  }, []);

  return { recipients, is_loading_recipients, is_sending, send_error, send_notice, sendNotification, dismissMessages };
}
