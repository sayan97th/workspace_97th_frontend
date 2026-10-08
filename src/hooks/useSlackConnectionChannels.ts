"use client";
import { useCallback, useEffect, useState } from "react";
import { slackService } from "@/services/slack.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { SlackChannelDto } from "@/types/slack";

export type SlackConnectionChannels = {
  channels: SlackChannelDto[];
  is_loading: boolean;
  is_refreshing: boolean;
  error: string | null;
  /** Reads the channels from Slack again, skipping the API cache. */
  refresh: () => Promise<void>;
};

/** Channels of one of the user's Slack accounts, for the Slack recipe's channel picker. Nothing loads without an account. */
export function useSlackConnectionChannels(connection_id: number | null): SlackConnectionChannels {
  const [channels, setChannels] = useState<SlackChannelDto[]>([]);
  const [is_loading, setIsLoading] = useState(false);
  const [is_refreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connection_id === null) return;
    let cancelled = false;

    // Reset for the newly picked account before its channels arrive.
    setIsLoading(true);
    setError(null);
    setChannels([]);
    slackService
      .getConnectionChannels(connection_id)
      .then((data) => {
        if (!cancelled) setChannels(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "Slack channels could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connection_id]);

  const refresh = useCallback(async () => {
    if (connection_id === null) return;
    setIsRefreshing(true);
    setError(null);
    try {
      setChannels(await slackService.getConnectionChannels(connection_id, true));
    } catch (failure) {
      setError(apiErrorMessage(failure, "Slack channels could not be refreshed."));
    } finally {
      setIsRefreshing(false);
    }
  }, [connection_id]);

  return { channels, is_loading, is_refreshing, error, refresh };
}
