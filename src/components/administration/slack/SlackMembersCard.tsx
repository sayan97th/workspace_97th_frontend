"use client";
import React from "react";
import Link from "next/link";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackWorkspaceDto } from "@/types/slack";
import { PRIMARY_BUTTON, SECTION_CARD, SECTION_HINT, SECTION_TITLE } from "@/components/administration/slack/slackAdminStyles";

export type SlackMembersCardProps = {
  workspace: SlackWorkspaceDto;
  admin: SlackAdministrationApi;
};

/**
 * Administration > Integrations > Slack > Members. Members whose email is the same in Slack are
 * linked in one click, anyone else uses "Connect my Slack" from My Profile.
 */
const SlackMembersCard: React.FC<SlackMembersCardProps> = ({ workspace, admin }) => (
  <section className={SECTION_CARD}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className={SECTION_TITLE}>Members</h3>
        <p className={SECTION_HINT}>
          {workspace.linked_members_count === 1 ? "1 member receives" : `${workspace.linked_members_count} members receive`} Slack notifications in{" "}
          {workspace.team_name}. Match members whose email is the same in Slack, anyone else can use &quot;Connect my Slack&quot; in{" "}
          <Link href="/profile?section=notifications" className="font-semibold text-brand-200 hover:underline">
            My Profile
          </Link>
          .
        </p>
      </div>
      <button type="button" onClick={() => void admin.matchMembers()} disabled={admin.busy_key !== null} className={`${PRIMARY_BUTTON} flex-none`}>
        {admin.busy_key === "match" ? "Matching…" : "Match members by email"}
      </button>
    </div>
  </section>
);

export default SlackMembersCard;
