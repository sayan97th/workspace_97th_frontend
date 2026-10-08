"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type {
  SlackChannelDto,
  SlackDiagnosticStatus,
  SlackNotificationTestCatalogDto,
  SlackNotificationTestDto,
  SlackNotificationTestResultDto,
  SlackRecipientDto,
} from "@/types/slack";

export type SlackNotificationTestsApi = {
  catalog: SlackNotificationTestCatalogDto | null;
  is_loading: boolean;
  load_error: string | null;
  reload: () => Promise<void>;
  recipients: SlackRecipientDto[];
  channels: SlackChannelDto[];
  is_refreshing_channels: boolean;
  refreshChannels: () => Promise<void>;
  /** The chosen recipient and channel, falling back to the first of each list. */
  selected_user_id: number | null;
  selected_channel_id: string | null;
  setSelectedUserId: (user_id: number | null) => void;
  setSelectedChannelId: (channel_id: string | null) => void;
  results: Record<string, SlackNotificationTestResultDto>;
  /** The test running right now, one at a time so Slack's rate limits are never hit in a burst. */
  running_key: string | null;
  is_running_batch: boolean;
  summary: Record<SlackDiagnosticStatus, number>;
  /** Why a test cannot run with the current choices, null when it can. */
  getBlocker: (test: SlackNotificationTestDto) => string | null;
  runTest: (test: SlackNotificationTestDto) => Promise<void>;
  runTests: (tests: SlackNotificationTestDto[]) => Promise<void>;
  stopBatch: () => void;
  clearResults: () => void;
};

const EMPTY_SUMMARY: Record<SlackDiagnosticStatus, number> = { passed: 0, warning: 0, failed: 0, skipped: 0 };

/**
 * State for the Slack notification test suite at /admin/test/slack/notifications. Loads the test
 * catalog with the members and channels the tests can target, then runs tests one by one against
 * the API and keeps the latest result of each.
 */
export function useSlackNotificationTests(): SlackNotificationTestsApi {
  const [catalog, setCatalog] = useState<SlackNotificationTestCatalogDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<SlackRecipientDto[]>([]);
  const [channels, setChannels] = useState<SlackChannelDto[]>([]);
  const [is_refreshing_channels, setIsRefreshingChannels] = useState(false);
  const [chosen_user_id, setSelectedUserId] = useState<number | null>(null);
  const [chosen_channel_id, setSelectedChannelId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SlackNotificationTestResultDto>>({});
  const [running_key, setRunningKey] = useState<string | null>(null);
  const [is_running_batch, setIsRunningBatch] = useState(false);
  const stop_requested = useRef(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const next_catalog = await slackService.getNotificationTests();
      setCatalog(next_catalog);

      // Without a workspace there is nobody to message and no channel to post to.
      if (next_catalog.workspace) {
        // Loaded independently, a broken bot token stops the channel list but not the member list.
        const [recipients_result, channels_result] = await Promise.allSettled([slackService.getNotificationRecipients(), slackService.getChannels()]);
        setRecipients(recipients_result.status === "fulfilled" ? recipients_result.value : []);
        setChannels(channels_result.status === "fulfilled" ? channels_result.value : []);
        const failure = [recipients_result, channels_result].find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failure) setLoadError(apiErrorMessage(failure.reason, "Failed to load the Slack members or channels."));
      } else {
        setRecipients([]);
        setChannels([]);
      }
    } catch (failure) {
      setLoadError(apiErrorMessage(failure, "Failed to load the Slack notification tests."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshChannels = useCallback(async () => {
    setIsRefreshingChannels(true);
    try {
      setChannels(await slackService.getChannels(true));
    } catch (failure) {
      setLoadError(apiErrorMessage(failure, "Failed to load the Slack channels."));
    } finally {
      setIsRefreshingChannels(false);
    }
  }, []);

  const selected_user_id = recipients.some((recipient) => recipient.user_id === chosen_user_id) ? chosen_user_id : (recipients[0]?.user_id ?? null);
  const selected_channel_id = channels.some((channel) => channel.id === chosen_channel_id) ? chosen_channel_id : (channels[0]?.id ?? null);

  const getBlocker = useCallback(
    (test: SlackNotificationTestDto): string | null => {
      if (!catalog?.workspace) return "Connect a Slack workspace first.";
      if (test.missing_scopes.length > 0) return `Needs ${test.missing_scopes.join(", ")}. Reconnect the workspace to grant it.`;
      const needs_recipient = test.target === "user" || test.target === "user_and_channel";
      const needs_channel = test.target === "channel" || test.target === "user_and_channel";
      if (needs_recipient && selected_user_id === null) return "Choose a recipient who linked their Slack account.";
      if (needs_channel && selected_channel_id === null) return "Choose a channel.";
      return null;
    },
    [catalog, selected_user_id, selected_channel_id]
  );

  const executeTest = useCallback(
    async (test: SlackNotificationTestDto) => {
      setRunningKey(test.key);
      let result: SlackNotificationTestResultDto;
      try {
        result = await slackService.runNotificationTest(test.key, { user_id: selected_user_id, channel_id: selected_channel_id });
      } catch (failure) {
        // The request itself failed (validation, rate limit, network), shown as a failed result.
        result = {
          key: test.key,
          label: test.label,
          status: "failed",
          detail: apiErrorMessage(failure, "The test could not be run."),
          steps: [],
          links: [],
          duration_ms: 0,
          ran_at: new Date().toISOString(),
        };
      }
      setResults((current) => ({ ...current, [test.key]: result }));
      setRunningKey(null);
    },
    [selected_user_id, selected_channel_id]
  );

  const runTest = useCallback(
    async (test: SlackNotificationTestDto) => {
      if (getBlocker(test) !== null) return;
      await executeTest(test);
    },
    [executeTest, getBlocker]
  );

  const runTests = useCallback(
    async (tests: SlackNotificationTestDto[]) => {
      stop_requested.current = false;
      setIsRunningBatch(true);
      for (const test of tests) {
        if (stop_requested.current) break;
        const blocker = getBlocker(test);
        if (blocker !== null) {
          setResults((current) => ({
            ...current,
            [test.key]: { key: test.key, label: test.label, status: "skipped", detail: blocker, steps: [], links: [], duration_ms: 0, ran_at: new Date().toISOString() },
          }));
          continue;
        }
        await executeTest(test);
      }
      setIsRunningBatch(false);
    },
    [executeTest, getBlocker]
  );

  const stopBatch = useCallback(() => {
    stop_requested.current = true;
  }, []);

  const clearResults = useCallback(() => setResults({}), []);

  const summary = useMemo(() => {
    const counts = { ...EMPTY_SUMMARY };
    Object.values(results).forEach((result) => {
      counts[result.status] += 1;
    });
    return counts;
  }, [results]);

  return {
    catalog,
    is_loading,
    load_error,
    reload,
    recipients,
    channels,
    is_refreshing_channels,
    refreshChannels,
    selected_user_id,
    selected_channel_id,
    setSelectedUserId,
    setSelectedChannelId,
    results,
    running_key,
    is_running_batch,
    summary,
    getBlocker,
    runTest,
    runTests,
    stopBatch,
    clearResults,
  };
}
