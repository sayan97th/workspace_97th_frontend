"use client";
import React from "react";
import type { SlackStatusDto } from "@/types/slack";

export type SlackSetupStepsProps = {
  status: SlackStatusDto | null;
};

type SetupStep = {
  key: string;
  title: string;
  detail: string;
  is_done: boolean;
};

/**
 * The three steps of the Slack setup, in the order they unlock each other: the Slack app is
 * saved once, a workspace is connected, then members get linked. The first unfinished step is
 * highlighted so an administrator always knows what to do next.
 */
const SlackSetupSteps: React.FC<SlackSetupStepsProps> = ({ status }) => {
  const linked_members_count = status?.workspace?.linked_members_count ?? 0;

  const steps: SetupStep[] = [
    {
      key: "app",
      title: "Set up the Slack app",
      detail: status?.is_configured ? "Saved, done once for the whole account." : "Create it with a configuration token or paste its credentials.",
      is_done: status?.is_configured ?? false,
    },
    {
      key: "workspace",
      title: "Connect a workspace",
      detail: status?.workspace ? `${status.workspace.team_name} is active.` : "Add the app to your Slack workspace.",
      is_done: status?.is_connected ?? false,
    },
    {
      key: "members",
      title: "Link members",
      detail:
        linked_members_count > 0
          ? `${linked_members_count} ${linked_members_count === 1 ? "member is" : "members are"} linked.`
          : "Match by email, or members use Connect my Slack.",
      is_done: linked_members_count > 0,
    },
  ];

  const current_index = steps.findIndex((step) => !step.is_done);

  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Slack setup progress">
      {steps.map((step, index) => {
        const is_current = index === current_index;

        return (
          <li
            key={step.key}
            aria-current={is_current ? "step" : undefined}
            className={`rounded-xl border p-4 ${
              is_current ? "border-brand-500/50 bg-brand-500/[0.08]" : "border-shell-border bg-shell-panel-alt"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                  step.is_done
                    ? "bg-[#00c875] text-white"
                    : is_current
                      ? "bg-brand-500 text-white"
                      : "border border-shell-border-strong text-shell-text-faint"
                }`}
              >
                {step.is_done ? "✓" : index + 1}
              </span>
              <span className="text-[13px] font-bold text-shell-text">{step.title}</span>
              <span className="sr-only">{step.is_done ? "(done)" : is_current ? "(next step)" : "(pending)"}</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-shell-text-muted">{step.detail}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default SlackSetupSteps;
