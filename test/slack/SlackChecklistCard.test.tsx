import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlackChecklistCard from "@/components/slack-test/SlackChecklistCard";
import { slackService } from "@/services/slack.service";
import type { SlackDiagnosticsDto } from "@/types/slack";

const diagnostics: SlackDiagnosticsDto = {
  ran_at: "2026-09-24T20:00:00+00:00",
  summary: { passed: 1, warning: 0, failed: 1, skipped: 1 },
  app: {
    client_id: "1234.5678",
    redirect_uri: "https://api.example.com/api/integrations/slack/callback",
    events_url: "https://api.example.com/api/integrations/slack/events",
    bot_scopes: ["chat:write"],
    user_scopes: ["openid"],
  },
  checks: [
    { key: "credentials", label: "Client ID and secret are set", status: "passed", detail: "Both values are present." },
    { key: "workspace", label: "A Slack workspace is connected", status: "failed", detail: "Use Add to Slack." },
    { key: "bot_token", label: "Bot token is valid", status: "skipped", detail: "Connect a workspace first." },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SlackChecklistCard", () => {
  test("lists every check with its status and the summary counts", () => {
    render(<SlackChecklistCard diagnostics={diagnostics} is_running={false} run_error={null} onRun={() => {}} />);

    expect(screen.getByText("Client ID and secret are set")).toBeInTheDocument();
    expect(screen.getByText("Use Add to Slack.")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
    expect(screen.queryByText("0 warning")).not.toBeInTheDocument();
  });

  test("runs the checks again and disables the button while running", async () => {
    const on_run = vi.fn();
    const { rerender } = render(<SlackChecklistCard diagnostics={diagnostics} is_running={false} run_error={null} onRun={on_run} />);

    await userEvent.click(screen.getByRole("button", { name: "Run again" }));
    expect(on_run).toHaveBeenCalledTimes(1);

    rerender(<SlackChecklistCard diagnostics={diagnostics} is_running run_error={null} onRun={on_run} />);
    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
  });

  test("shows the error when the diagnostics request fails", () => {
    render(<SlackChecklistCard diagnostics={null} is_running={false} run_error="Failed to run the Slack diagnostics." onRun={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to run the Slack diagnostics.");
  });
});

describe("slack diagnostics requests", () => {
  test("the channel test posts the channel id to the diagnostics endpoint", async () => {
    const calls: { url: string; method: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: String(init?.method), body: String(init?.body) });
      return new Response(JSON.stringify({ message: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    await slackService.sendChannelTestMessage("C0123ABCD");

    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toMatch(/\/api\/integrations\/slack\/diagnostics\/channel-test$/);
    expect(JSON.parse(calls[0].body)).toEqual({ channel_id: "C0123ABCD" });
  });
});
