import React from "react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import SlackLogo from "@/components/slack/SlackLogo";
import type { IntegrationAppKey } from "@/types/integration-overview";
import { EnvelopeIcon } from "../../integrations/integrationUi";

/** The logo of any integration app, the built in Email channel draws an envelope. */
export default function IntegrationAppLogo({ app, size = 20 }: { app: IntegrationAppKey; size?: number }) {
  if (app === "email") return <EnvelopeIcon size={size} />;
  if (app === "slack") return <SlackLogo size={size} />;
  return <ExternalAppLogo app={app} size={size} />;
}
