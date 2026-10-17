"use client";
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Pencil } from "lucide-react";
import ProfileTooltip from "./ProfileTooltip";

export type ProfileInlineFieldProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  input_type?: "text" | "email" | "tel";
  /** Blank values are rejected with this message instead of being saved. */
  required_message?: string;
  max_length?: number;
  /** Saves the trimmed value. Rejects with the message to show under the field. */
  onSave: (value: string) => Promise<void>;
};

/**
 * One editable row of the Personal info overview, monday style: the value reads as plain text,
 * shows a frame and a pencil on hover, and turns into an input on click. Enter or leaving the
 * field saves, Escape restores the saved value. Unchanged values are not sent.
 */
const ProfileInlineField: React.FC<ProfileInlineFieldProps> = ({
  icon,
  label,
  value,
  placeholder,
  input_type = "text",
  required_message,
  max_length = 255,
  onSave,
}) => {
  const [is_editing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  // Set while a save runs or the edit closes, so the blur fired as the input unmounts does not save again.
  const is_settling_ref = useRef(false);
  const input_id = React.useId();

  useEffect(() => {
    if (!is_editing) setDraft(value);
  }, [value, is_editing]);

  useEffect(() => {
    if (is_editing) input_ref.current?.select();
  }, [is_editing]);

  const startEditing = () => {
    is_settling_ref.current = false;
    setErrorMessage(null);
    setDraft(value);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    is_settling_ref.current = true;
    setDraft(value);
    setErrorMessage(null);
    setIsEditing(false);
  };

  const commitEditing = async () => {
    if (is_settling_ref.current) return;
    const next_value = draft.trim();
    if (next_value === value.trim()) {
      is_settling_ref.current = true;
      setIsEditing(false);
      return;
    }
    if (!next_value && required_message) {
      setErrorMessage(required_message);
      return;
    }
    is_settling_ref.current = true;
    setIsSaving(true);
    try {
      await onSave(next_value);
      setErrorMessage(null);
      setIsEditing(false);
    } catch (error) {
      is_settling_ref.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Could not save this field. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // The input is disabled while saving, so focus comes back once a failed save re-enables it.
  useEffect(() => {
    if (is_editing && !is_saving && error_message) input_ref.current?.focus();
  }, [is_editing, is_saving, error_message]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="profile-field">
      <label htmlFor={input_id} className="profile-field-label">
        {icon}
        {label}
      </label>
      <div className="profile-field-value">
        {is_editing ? (
          <div className="relative">
            <input
              id={input_id}
              ref={input_ref}
              type={input_type}
              value={draft}
              maxLength={max_length}
              placeholder={placeholder}
              disabled={is_saving}
              aria-invalid={error_message ? true : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => void commitEditing()}
              className="profile-input pr-9"
            />
            {is_saving ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="profile-spinner profile-spinner-small block" />
              </span>
            ) : null}
          </div>
        ) : (
          <ProfileTooltip content={`Edit ${label.toLowerCase()}`} className="w-full">
            <button id={input_id} type="button" onClick={startEditing} className="profile-inline-value">
              <span className={`profile-inline-text ${value ? "" : "profile-inline-placeholder"}`}>{value || placeholder}</span>
              <Pencil size={14} strokeWidth={1.75} className="profile-inline-pencil" aria-hidden="true" />
            </button>
          </ProfileTooltip>
        )}
        {error_message ? (
          <p className="profile-field-error" role="alert">
            <AlertCircle size={13} aria-hidden="true" />
            {error_message}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileInlineField;
