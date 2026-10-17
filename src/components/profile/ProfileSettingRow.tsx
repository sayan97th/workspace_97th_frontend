"use client";
import React from "react";
import { ToggleSwitch } from "@/components/board";
import "./profile.scss";

export type ProfileSettingGroupProps = {
  title?: string;
  description?: React.ReactNode;
  /** Trailing header content, e.g. a "Reset to defaults" link. */
  action?: React.ReactNode;
  /** Wraps the children in the bordered list frame, off for groups that bring their own layout. */
  is_framed?: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Titled block of settings inside a My Profile card, its rows share one bordered frame. */
export const ProfileSettingGroup: React.FC<ProfileSettingGroupProps> = ({
  title,
  description,
  action,
  is_framed = true,
  children,
  className = "",
}) => (
  <section className={`profile-group ${className}`}>
    {title || action ? (
      <div className="profile-group-header">
        <div className="min-w-0">
          {title ? <h3 className="profile-group-title">{title}</h3> : null}
          {description ? <p className="profile-group-description">{description}</p> : null}
        </div>
        {action}
      </div>
    ) : null}
    {is_framed ? <div className="profile-group-frame">{children}</div> : children}
  </section>
);

export type ProfileSettingRowProps = {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Trailing control. Ignored when `is_on` is given, the row then renders its own switch. */
  control?: React.ReactNode;
  is_on?: boolean;
  onToggle?: () => void;
  is_disabled?: boolean;
  /** Full width content under the label, e.g. the quiet hours time pickers. */
  children?: React.ReactNode;
};

/**
 * One setting inside a {@link ProfileSettingGroup}: label and description on the left, a switch or
 * any other control on the right. The switch is a real `role="switch"` button labelled by the row.
 */
export const ProfileSettingRow: React.FC<ProfileSettingRowProps> = ({
  label,
  description,
  control,
  is_on,
  onToggle,
  is_disabled = false,
  children,
}) => {
  const label_id = React.useId();
  return (
    <div className="profile-row">
      <div className="profile-row-text">
        <div id={label_id} className="profile-row-label">
          {label}
        </div>
        {description ? <div className="profile-row-description">{description}</div> : null}
      </div>
      <div className="profile-row-control">
        {is_on !== undefined ? (
          <button
            type="button"
            role="switch"
            aria-checked={is_on}
            aria-labelledby={label_id}
            disabled={is_disabled}
            onClick={onToggle}
            className="profile-switch disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ToggleSwitch is_on={is_on} />
          </button>
        ) : (
          control
        )}
      </div>
      {children ? <div className="profile-row-extra">{children}</div> : null}
    </div>
  );
};

export type ProfileSegmentedOption<T extends string> = { value: T; label: string };

export type ProfileSegmentedProps<T extends string> = {
  value: T;
  options: ProfileSegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
};

/** Small radio group drawn as one bordered strip, the selected option filled with the primary color. */
export const ProfileSegmented = <T extends string>({
  value,
  options,
  onChange,
  "aria-label": aria_label,
}: ProfileSegmentedProps<T>) => (
  <div role="radiogroup" aria-label={aria_label} className="profile-segmented">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className="profile-segmented-option"
      >
        {option.label}
      </button>
    ))}
  </div>
);
