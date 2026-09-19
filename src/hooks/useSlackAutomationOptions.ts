"use client";
import { useEffect, useState } from "react";
import { slackService } from "@/services/slack.service";
import type { SlackChannelDto, SlackStatusDto } from "@/types/slack";

export type SlackAutomationOptions = {
  status: SlackStatusDto | null;
  channels: SlackChannelDto[];
  is_loading: boolean;
  error: string | null;
};

/**
 * What the automation builder needs to offer Slack actions: whether a workspace is
 * connected and which channels the app can post to. Fetched each time the modal opens,
 * so a workspace connected or disconnected in the meantime is reflected straight away.
 */
export function useSlackAutomationOptions(is_open: boolean): SlackAutomationOptions {
  const [status, setStatus] = useState<SlackStatusDto | null>(null);
  const [channels, setChannels] = useState<SlackChannelDto[]>([]);
  const [is_loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next_status = await slackService.getStatus();
        if (cancelled) return;
        setStatus(next_status);

        if (next_status.is_connected) {
          const next_channels = await slackService.getChannels();
          if (!cancelled) setChannels(next_channels);
        } else {
          setChannels([]);
        }
      } catch {
        if (!cancelled) setError("Slack channels could not be loaded.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [is_open]);

  return { status, channels, is_loading, error };
}
