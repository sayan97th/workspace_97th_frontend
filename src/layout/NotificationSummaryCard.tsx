"use client";
import React from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { NotificationSummary, NotificationTabId } from "@/data/notifications-data";
import { getUserInitials } from "@/lib/user";
import { getDeactivatedClass } from "@/lib/deactivated-user";

type NotificationSummaryCardProps = {
  summary: NotificationSummary;
  /** Jumps to a tab of the drawer, optionally limited to what is still unread. */
  onOpenTab: (tab: NotificationTabId, unread_only: boolean) => void;
};

type SummaryStat = {
  key: string;
  count: number;
  label: string;
  /** Where clicking the stat leads. Stats with no matching tab are plain text. */
  target?: { tab: NotificationTabId; unread_only: boolean };
};

const pluralize = (count: number, singular: string, plural: string): string => `${count} ${count === 1 ? singular : plural}`;

/**
 * The card at the top of the notifications drawer: what is waiting for the
 * person today, unread mentions, replies, assignments, due date reminders and
 * what they saved for later, plus who wrote the most unread notifications.
 * Every count that has a matching tab is a shortcut to it.
 */
const NotificationSummaryCard: React.FC<NotificationSummaryCardProps> = ({ summary, onOpenTab }) => {
  const all_stats: SummaryStat[] = [
    { key: "mentions", count: summary.mentions, label: pluralize(summary.mentions, "mention", "mentions"), target: { tab: "mentioned", unread_only: true } },
    { key: "replies", count: summary.replies, label: pluralize(summary.replies, "reply", "replies"), target: { tab: "replies", unread_only: true } },
    { key: "assigned", count: summary.assigned, label: `${summary.assigned} assigned to you`, target: { tab: "assigned", unread_only: true } },
    { key: "reactions", count: summary.reactions, label: pluralize(summary.reactions, "reaction", "reactions"), target: { tab: "reactions", unread_only: true } },
    { key: "due", count: summary.due_reminders, label: pluralize(summary.due_reminders, "due date reminder", "due date reminders") },
    { key: "saved", count: summary.saved_count, label: `${summary.saved_count} saved`, target: { tab: "saved", unread_only: false } },
    { key: "snoozed", count: summary.snoozed_count, label: `${summary.snoozed_count} snoozed` },
  ];
  const stats = all_stats.filter((stat) => stat.count > 0);

  const is_caught_up = summary.unread_count === 0;

  return (
    <section aria-label="Notification summary" className="mb-5 rounded-[12px] border border-shell-border bg-shell-panel-alt p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13.5px] font-bold text-shell-text">{is_caught_up ? "You're all caught up" : "Waiting for you"}</h3>
        <span className="text-[11.5px] text-shell-text-faint">
          {summary.unread_count} unread, {summary.today_count} new today
        </span>
      </div>

      {stats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.map((stat) => {
            const chip_class = "rounded-full border border-shell-border px-2.5 py-1 text-[12px] font-semibold";
            return stat.target ? (
              <button
                key={stat.key}
                type="button"
                onClick={() => onOpenTab(stat.target!.tab, stat.target!.unread_only)}
                className={`${chip_class} text-shell-text-secondary transition-colors hover:border-shell-border-strong hover:bg-shell-hover hover:text-shell-text`}
              >
                {stat.label}
              </button>
            ) : (
              <span key={stat.key} className={`${chip_class} text-shell-text-muted`}>
                {stat.label}
              </span>
            );
          })}
        </div>
      )}

      {summary.top_actors.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-shell-text-muted">
          <span>Most from</span>
          {summary.top_actors.map((actor) => (
            <span key={actor.id} className="flex items-center gap-1.5">
              <PersonAvatar
                person={{
                  id: String(actor.id),
                  name: actor.name,
                  initials: getUserInitials({ full_name: actor.name }),
                  avatar_seed: actor.id,
                  avatar_url: actor.avatar_url ?? undefined,
                  is_deactivated: actor.is_deactivated,
                }}
                size={18}
              />
              <span className={`font-semibold text-shell-text-secondary ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</span>
              <span className="text-shell-text-faint">{actor.count}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default NotificationSummaryCard;
