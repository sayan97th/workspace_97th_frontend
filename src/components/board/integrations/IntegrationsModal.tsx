"use client";
import React, { useState } from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";

export type IntegrationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  /**
   * In-app path Slack sends the browser back to after an OAuth round trip. It should reopen this
   * modal, e.g. `/boards/42?integrate=slack`, see `TableBoardView`.
   */
  return_path: string;
  /** Closes this modal and opens the automations builder; the "Add automation" buttons are hidden when omitted. */
  onOpenAutomations?: () => void;
};

const PRIMARY_BUTTON = "h-8 rounded-[7px] bg-boardtree-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";
const SECONDARY_BUTTON = "h-8 rounded-[7px] border border-boardtree-border px-3.5 text-[12.5px] text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40";
const DANGER_BUTTON = "h-8 rounded-[7px] bg-boardtree-danger px-3.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-40";
const STEP_LABEL = "text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint";

const EnvelopeIcon = () => (
  <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
    <rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.4 4.6 L8 9 L13.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function StatusPill({ label, is_positive }: { label: string; is_positive: boolean }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${is_positive ? "bg-[#00c875]/[0.14] text-[#0a9a5c] dark:text-[#3ddc97]" : "bg-boardtree-track text-boardtree-text-muted"}`}>
      {label}
    </span>
  );
}

function IntegrationCard({ icon, title, status_pill, description, children }: { icon: React.ReactNode; title: string; status_pill: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-boardtree-border-soft p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[9px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-text-muted">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-boardtree-text">{title}</h3>
            {status_pill}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Board header's "Integrate" button. One place to connect the channels notifications and
 * automations can reach people through: Email (built in, nothing to install) and Slack, where an
 * administrator adds the workspace and every member then links their own account.
 */
export default function IntegrationsModal({ is_open, onClose, return_path, onOpenAutomations }: IntegrationsModalProps) {
  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Integrations"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-[600px] max-w-[94vw] flex-col rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-boardtree-border-soft px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold text-boardtree-text">Integrations</div>
            <div className="mt-0.5 text-[12.5px] text-boardtree-text-muted">Connect the channels your team uses to get notified.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <IntegrationsModalBody return_path={return_path} onOpenAutomations={onOpenAutomations} />
      </div>
    </div>
  );
}

/** Split from the shell so Slack's status is only fetched once the modal is actually open. */
function IntegrationsModalBody({ return_path, onOpenAutomations }: Pick<IntegrationsModalProps, "return_path" | "onOpenAutomations">) {
  const slack = useSlackIntegration();
  const [is_confirming_disconnect, setIsConfirmingDisconnect] = useState(false);

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const can_manage = status?.can_manage ?? false;
  const banner_message = slack.error ?? slack.notice;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {banner_message && (
        <div
          role={slack.error ? "alert" : "status"}
          className={`mb-3 flex items-start justify-between gap-3 rounded-[8px] border px-3 py-2 text-[12.5px] ${slack.error ? "border-boardtree-danger/30 bg-boardtree-danger-hover text-boardtree-danger" : "border-[#00c875]/30 bg-[#00c875]/[0.1] text-[#0a9a5c] dark:text-[#3ddc97]"}`}
        >
          <span>{banner_message}</span>
          <button type="button" onClick={slack.dismissMessages} className="flex-none text-[12px] font-medium opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <IntegrationCard
          icon={<EnvelopeIcon />}
          title="Email"
          status_pill={<StatusPill label="Ready to use" is_positive />}
          description="Notification emails and email automations are sent by your account's mail service, so there is nothing to connect."
        >
          <div className="flex flex-wrap gap-2">
            <Link href="/profile?section=notifications" className={`${SECONDARY_BUTTON} inline-flex items-center`}>Email preferences</Link>
            {onOpenAutomations && <button type="button" onClick={onOpenAutomations} className={SECONDARY_BUTTON}>Add email automation</button>}
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={<SlackLogo size={22} />}
          title="Slack"
          status_pill={slack.is_loading ? null : <StatusPill label={workspace ? "Connected" : "Not connected"} is_positive={!!workspace} />}
          description="Get a Slack message when someone tags or assigns you, and let automations post to channels or message people."
        >
          {slack.is_loading ? (
            <div className="text-[12.5px] text-boardtree-text-faint">Loading Slack...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className={STEP_LABEL}>1. Slack workspace</div>
                {!status?.is_configured && !workspace && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">
                    Slack is not configured on the server yet. Ask a developer to set <span className="font-semibold text-boardtree-text-secondary">SLACK_CLIENT_ID</span> and <span className="font-semibold text-boardtree-text-secondary">SLACK_CLIENT_SECRET</span>.
                  </p>
                )}
                {!workspace && status?.is_configured && (
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-boardtree-text-muted">{can_manage ? "Add the app to your Slack workspace." : "Ask an account administrator to add Slack."}</p>
                    {can_manage && (
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.connectWorkspace(return_path)} className={`${PRIMARY_BUTTON} flex-none`}>
                        {slack.is_working ? "Redirecting..." : "Add to Slack"}
                      </button>
                    )}
                  </div>
                )}
                {workspace && (
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-boardtree-text-muted">
                      <span className="font-semibold text-boardtree-text">{workspace.team_name}</span>
                      {`, ${workspace.linked_members_count} ${workspace.linked_members_count === 1 ? "member" : "members"} connected`}
                    </p>
                    {can_manage && !is_confirming_disconnect && (
                      <button type="button" onClick={() => setIsConfirmingDisconnect(true)} className={`${SECONDARY_BUTTON} flex-none`}>Disconnect</button>
                    )}
                  </div>
                )}
                {workspace && can_manage && is_confirming_disconnect && (
                  <div className="mt-2 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover p-3">
                    <p className="text-[12.5px] leading-relaxed text-boardtree-text-secondary">Everyone stops receiving Slack notifications and automations that post to Slack are switched off.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={slack.is_working}
                        onClick={async () => {
                          await slack.disconnectWorkspace();
                          setIsConfirmingDisconnect(false);
                        }}
                        className={DANGER_BUTTON}
                      >
                        {slack.is_working ? "Disconnecting..." : "Disconnect Slack"}
                      </button>
                      <button type="button" onClick={() => setIsConfirmingDisconnect(false)} className={SECONDARY_BUTTON}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className={workspace ? "" : "opacity-50"}>
                <div className={STEP_LABEL}>2. Your Slack account</div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-boardtree-text-muted">
                    {link ? `Connected as ${link.slack_display_name ?? "your Slack account"}.` : "Link your own account to receive your notifications in Slack."}
                  </p>
                  {workspace && !link && (
                    <button type="button" disabled={slack.is_working} onClick={() => void slack.connectMyAccount(return_path)} className={`${PRIMARY_BUTTON} flex-none`}>
                      {slack.is_working ? "Redirecting..." : "Connect my Slack"}
                    </button>
                  )}
                  {link && (
                    <div className="flex flex-none gap-2">
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.sendTestMessage()} className={SECONDARY_BUTTON}>Send test</button>
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.disconnectMyAccount()} className={SECONDARY_BUTTON}>Disconnect</button>
                    </div>
                  )}
                </div>
                {link && (
                  <Link href="/profile?section=notifications" className="mt-1.5 inline-block text-[12px] font-medium text-boardtree-accent hover:underline">Choose what reaches you in Slack</Link>
                )}
              </div>

              {workspace && onOpenAutomations && (
                <div>
                  <button type="button" onClick={onOpenAutomations} className={SECONDARY_BUTTON}>Add Slack automation</button>
                </div>
              )}
            </div>
          )}
        </IntegrationCard>
      </div>
    </div>
  );
}
