"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type { SlackChannelDto, SlackDiagnosticsDto } from "@/types/slack";

export type SlackDiagnosticsApi = {
  diagnostics: SlackDiagnosticsDto | null;
  is_running: boolean;
  run_error: string | null;
  runDiagnostics: () => Promise<void>;
  /** Whether the last run confirmed a working bot token, which every live message test needs. */
  has_working_bot: boolean;
  channels: SlackChannelDto[];
  is_loading_channels: boolean;
  is_sending_channel_test: boolean;
  channel_test_error: string | null;
  channel_test_notice: string | null;
  sendChannelTest: (channel_id: string) => Promise<void>;
};

/**
 * State for the Slack diagnostics page at /admin/test/slack. Runs every server side check once on
 * mount and on demand, and loads the channel list only once a working bot token is confirmed,
 * since the channel test needs one.
 */
export function useSlackDiagnostics(): SlackDiagnosticsApi {
  const [diagnostics, setDiagnostics] = useState<SlackDiagnosticsDto | null>(null);
  const [is_running, setIsRunning] = useState(true);
  const [run_error, setRunError] = useState<string | null>(null);
  const [channels, setChannels] = useState<SlackChannelDto[]>([]);
  const [is_loading_channels, setIsLoadingChannels] = useState(false);
  const [is_sending_channel_test, setIsSendingChannelTest] = useState(false);
  const [channel_test_error, setChannelTestError] = useState<string | null>(null);
  const [channel_test_notice, setChannelTestNotice] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      setDiagnostics(await slackService.runDiagnostics());
    } catch (failure) {
      setRunError(apiErrorMessage(failure, "Failed to run the Slack diagnostics."));
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const has_working_bot = diagnostics?.checks.some((check) => check.key === "bot_token" && check.status === "passed") ?? false;

  useEffect(() => {
    if (!has_working_bot) {
      setChannels([]);
      return;
    }

    let cancelled = false;
    setIsLoadingChannels(true);

    slackService
      .getChannels()
      .then((data) => {
        if (!cancelled) setChannels(data);
      })
      .catch((failure) => {
        if (!cancelled) setChannelTestError(apiErrorMessage(failure, "Failed to load the Slack channels."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingChannels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [has_working_bot]);

  const sendChannelTest = useCallback(async (channel_id: string) => {
    setIsSendingChannelTest(true);
    setChannelTestError(null);
    setChannelTestNotice(null);
    try {
      const response = await slackService.sendChannelTestMessage(channel_id);
      setChannelTestNotice(response.message);
    } catch (failure) {
      setChannelTestError(apiErrorMessage(failure, "Failed to post the test message."));
    } finally {
      setIsSendingChannelTest(false);
    }
  }, []);

  return {
    diagnostics,
    is_running,
    run_error,
    runDiagnostics,
    has_working_bot,
    channels,
    is_loading_channels,
    is_sending_channel_test,
    channel_test_error,
    channel_test_notice,
    sendChannelTest,
  };
}
