"use client";
import React from "react";
import AutomationsModal, { type AutomationsModalProps } from "../automations/AutomationsModal";

export type IntegrationsModalProps = Omit<AutomationsModalProps, "variant" | "create_for_column_id" | "onOpenIntegrations">;

/**
 * The board header's "Integrate" button, modelled on monday.com's integration center. Create lists
 * every outside app (Email, Slack, Gmail, Outlook, Google Calendar) with its templates and the
 * connection setup, Manage lists the automations that use them with their run history and usage.
 * It runs on the Automations dialog's engine, so the sentence builder and Manage behave the same,
 * only scoped to integrations.
 */
export default function IntegrationsModal(props: IntegrationsModalProps) {
  return <AutomationsModal {...props} variant="integrations" />;
}
