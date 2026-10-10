"use client";
import React from "react";
import { Megaphone } from "lucide-react";
import AnnouncementBar from "../AnnouncementBar";
import { ANNOUNCEMENT_TONE_OPTIONS } from "../announcement-tones";
import { Field, OrganizationCard, ToggleField, input_class, textarea_class } from "../organization-fields";
import { FIELD_MAX_LENGTHS } from "../organization-form";
import type { OrganizationSectionProps } from "./section-props";

/** An account wide banner under the top bar, for maintenance windows, holidays or launches. */
const AnnouncementCard: React.FC<OrganizationSectionProps> = ({ draft, field_errors, setField, is_read_only }) => (
  <OrganizationCard
    id="announcement"
    icon={Megaphone}
    title="Announcement banner"
    description="A message under the top bar for everyone in the account, for maintenance windows, holidays or launches."
  >
    <ToggleField
      label="Show the announcement"
      description="Editing the message shows it again to people who already closed it."
      is_on={draft.announcement_enabled}
      onToggle={() => setField("announcement_enabled", !draft.announcement_enabled)}
      is_disabled={is_read_only}
    />

    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      <Field
        label="Message"
        className="sm:col-span-2"
        error={field_errors.announcement_message}
        counter={{ length: draft.announcement_message.length, max: FIELD_MAX_LENGTHS.announcement_message ?? 280 }}
      >
        {(input_props) => (
          <textarea
            {...input_props}
            rows={2}
            value={draft.announcement_message}
            onChange={(event) => setField("announcement_message", event.target.value)}
            maxLength={FIELD_MAX_LENGTHS.announcement_message}
            className={textarea_class}
            placeholder="The office is closed on Friday. Boards stay available as usual."
          />
        )}
      </Field>

      <div className="sm:col-span-2">
        <div className="mb-1.5 text-[13px] font-semibold text-shell-text">Tone</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Announcement tone">
          {ANNOUNCEMENT_TONE_OPTIONS.map((tone) => {
            const is_selected = draft.announcement_tone === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                role="radio"
                aria-checked={is_selected}
                disabled={is_read_only}
                onClick={() => setField("announcement_tone", tone.id)}
                className={`inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium transition-shadow disabled:cursor-not-allowed ${tone.class_name} ${
                  is_selected ? "ring-2 ring-shell-text ring-offset-1 ring-offset-shell-panel" : "opacity-80 hover:opacity-100"
                }`}
              >
                {tone.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label="Link label"
        is_optional
        error={field_errors.announcement_link_label}
        counter={{ length: draft.announcement_link_label.length, max: FIELD_MAX_LENGTHS.announcement_link_label ?? 40 }}
      >
        {(input_props) => (
          <input
            {...input_props}
            type="text"
            value={draft.announcement_link_label}
            onChange={(event) => setField("announcement_link_label", event.target.value)}
            maxLength={FIELD_MAX_LENGTHS.announcement_link_label}
            className={input_class}
            placeholder="Read more"
          />
        )}
      </Field>
      <Field label="Link" is_optional error={field_errors.announcement_link_url}>
        {(input_props) => (
          <input
            {...input_props}
            type="url"
            value={draft.announcement_link_url}
            onChange={(event) => setField("announcement_link_url", event.target.value)}
            className={input_class}
            placeholder="https://"
          />
        )}
      </Field>

      <div className="sm:col-span-2">
        <ToggleField
          label="People can close it"
          description="Turn off for messages everyone must keep seeing, like an outage."
          is_on={draft.announcement_dismissible}
          onToggle={() => setField("announcement_dismissible", !draft.announcement_dismissible)}
          is_disabled={is_read_only}
        />
      </div>
    </div>

    <div className="mt-5">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-shell-text-faint">Preview</div>
      <div className="overflow-hidden rounded-md border border-shell-border">
        <AnnouncementBar
          message={draft.announcement_message.trim() || "Your announcement shows here."}
          tone={draft.announcement_tone}
          link_label={draft.announcement_link_label.trim() || null}
          link_url={draft.announcement_link_url.trim() || null}
          onDismiss={draft.announcement_dismissible ? () => undefined : undefined}
        />
      </div>
      {!draft.announcement_enabled ? (
        <p className="mt-1.5 text-[12px] text-shell-text-muted">The banner is off, nobody sees it until you turn it on and save.</p>
      ) : null}
    </div>
  </OrganizationCard>
);

export default AnnouncementCard;
