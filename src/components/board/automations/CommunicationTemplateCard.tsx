import React from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import { CHANNEL_LABELS, splitTitle, type CommunicationChannel, type CommunicationTemplate } from "./communicationTemplates";

const EnvelopeIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.4 4.6 L8 9 L13.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The small "app to channel" strip at the top of a template card. */
export function ChannelBadge({ channel }: { channel: CommunicationChannel }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-boardtree-text-faint">
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-accent">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M2 12 L5.2 4 L8 9.2 L10.8 4 L14 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span aria-hidden="true">&rarr;</span>
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-text-muted">
        {channel === "email" ? <EnvelopeIcon /> : <SlackLogo size={13} />}
      </span>
      <span>{CHANNEL_LABELS[channel]}</span>
    </div>
  );
}

export type CommunicationTemplateCardProps = {
  template: CommunicationTemplate;
  onUse: (template: CommunicationTemplate) => void;
};

/** One entry of the automations "Communication" library, mirrors a template card in monday.com's automation center. */
export default function CommunicationTemplateCard({ template, onUse }: CommunicationTemplateCardProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[10px] border border-boardtree-border-soft p-3.5 transition-shadow hover:shadow-[0_4px_14px_rgba(30,34,55,0.08)]">
      <div>
        <ChannelBadge channel={template.channel} />
        <div className="mt-3 text-[13.5px] leading-snug text-boardtree-text-muted">
          {splitTitle(template.title).map((segment, index) => (
            <span key={index} className={segment.is_bold ? "font-semibold text-boardtree-text" : undefined}>
              {segment.text}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onUse(template)}
        className="h-8 w-full rounded-[6px] border border-boardtree-border text-[12.5px] text-boardtree-text hover:bg-boardtree-hover"
      >
        Use template
      </button>
    </div>
  );
}
