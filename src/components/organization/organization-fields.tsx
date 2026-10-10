"use client";
import React, { useId } from "react";
import { ToggleSwitch } from "@/components/board";

/** One settings card with an icon, a title and a short explanation. */
export const OrganizationCard: React.FC<{
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ id, icon: Icon, title, description, children, aside }) => (
  <section
    id={id}
    data-organization-section
    aria-labelledby={`${id}-title`}
    className="rounded-xl border border-shell-border bg-shell-panel"
  >
    <header className="flex items-start gap-3 border-b border-shell-border px-6 py-4">
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={`${id}-title`} className="font-outfit text-section-title text-shell-text">
          {title}
        </h2>
        <p className="mt-0.5 text-[13px] leading-relaxed text-shell-text-muted">{description}</p>
      </div>
      {aside}
    </header>
    <div className="px-6 py-5">{children}</div>
  </section>
);

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Shows "12/120" under the input. */
  counter?: { length: number; max: number };
  is_optional?: boolean;
  className?: string;
  children: (input_props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
};

/** Label, control, hint or error, and an optional character counter. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, counter, is_optional, className = "", children }) => {
  const id = useId();
  const message_id = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-shell-text">
        {label}
        {is_optional ? <span className="text-[12px] font-normal text-shell-text-faint">Optional</span> : null}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": message ? message_id : undefined })}
      {message || counter ? (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-[12px] leading-snug">
          <span id={message_id} className={error ? "text-[#d83a52]" : "text-shell-text-muted"}>
            {message}
          </span>
          {counter ? (
            <span className={`flex-none tabular-nums ${counter.length > counter.max ? "text-[#d83a52]" : "text-shell-text-faint"}`}>
              {counter.length}/{counter.max}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const input_class =
  "h-10 w-full rounded-md border border-shell-border-strong bg-shell-panel px-3 text-[14px] text-shell-text outline-none transition-colors placeholder:text-shell-text-faint hover:border-shell-text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-shell-panel-alt disabled:text-shell-text-muted aria-[invalid=true]:border-[#d83a52]";

export const textarea_class = `${input_class} h-auto min-h-[88px] resize-y py-2.5 leading-relaxed`;

/** A label + description row with a switch, disabled together with its fieldset. */
export const ToggleField: React.FC<{
  label: string;
  description?: string;
  is_on: boolean;
  onToggle: () => void;
  is_disabled?: boolean;
}> = ({ label, description, is_on, onToggle, is_disabled = false }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <div className="text-[13.5px] font-semibold text-shell-text">{label}</div>
      {description ? <div className="mt-0.5 text-[12.5px] leading-relaxed text-shell-text-muted">{description}</div> : null}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={is_on}
      aria-label={label}
      onClick={onToggle}
      disabled={is_disabled}
      className="mt-0.5 flex flex-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ToggleSwitch is_on={is_on} />
    </button>
  </div>
);
