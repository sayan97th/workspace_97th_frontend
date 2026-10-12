"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, LockIcon, ShareNodesIcon } from "@/icons/workspace-icons";
import type { BoardType } from "@/types/workspace";
import "./create-doc-modal.css";

export type CreateDocValues = { label: string; board_type: BoardType };

export type CreateDocModalProps = {
  is_open: boolean;
  onSubmit: (values: CreateDocValues) => void | Promise<void>;
  onClose: () => void;
};

type PrivacyOption = { value: BoardType; label: string; icon?: React.ReactNode; hint: string };

const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: "main", label: "Main", hint: "Visible to everyone in your account" },
  { value: "private", label: "Private", icon: <LockIcon size={14} />, hint: "Visible only to you and the people you invite" },
  {
    value: "shareable",
    label: "Shareable",
    icon: <ShareNodesIcon size={14} />,
    hint: "Visible to everyone in your account and to guests you invite",
  },
];

const DEFAULT_NAME = "New Doc";
const NAME_MAX_LENGTH = 255;

/**
 * monday.com style "Create Doc" dialog opened from the sidebar's "Add to
 * workspace" menu: a name field prefilled with "New Doc" and the doc's
 * privacy (Main, Private or Shareable), stored as the item's `board_type`.
 */
const CreateDocModal: React.FC<CreateDocModalProps> = ({ is_open, onSubmit, onClose }) => {
  const [name, setName] = useState(DEFAULT_NAME);
  const [board_type, setBoardType] = useState<BoardType>("main");
  const [is_saving, setIsSaving] = useState(false);
  const [is_touched, setIsTouched] = useState(false);
  const input_ref = useRef<HTMLInputElement>(null);
  const title_id = useId();
  const input_id = useId();
  const hint_id = useId();

  useEffect(() => {
    if (!is_open) return;
    setName(DEFAULT_NAME);
    setBoardType("main");
    setIsSaving(false);
    setIsTouched(false);
    // Select the default name so typing replaces it, like monday.
    requestAnimationFrame(() => input_ref.current?.select());
  }, [is_open]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  const trimmed_name = name.trim();
  const has_error = is_touched && trimmed_name.length === 0;
  const can_submit = trimmed_name.length > 0 && !is_saving;
  const selected_option = PRIVACY_OPTIONS.find((option) => option.value === board_type) ?? PRIVACY_OPTIONS[0];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsTouched(true);
    if (!can_submit) return;
    setIsSaving(true);
    try {
      await onSubmit({ label: trimmed_name, board_type });
      onClose();
    } catch {
      // The caller reports the error, keep the dialog open so nothing typed is lost.
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="create-doc-theme create-doc-overlay">
      <div className="create-doc-backdrop" onClick={onClose} aria-hidden="true" />

      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby={title_id} className="create-doc-dialog" noValidate>
        <button type="button" onClick={onClose} aria-label="Close" className="create-doc-close">
          <CloseIcon size={16} />
        </button>

        <h2 id={title_id} className="create-doc-title font-heading">
          Create Doc
        </h2>

        <label htmlFor={input_id} className="create-doc-label">
          Doc name
        </label>
        <input
          ref={input_ref}
          id={input_id}
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setIsTouched(true)}
          aria-invalid={has_error}
          autoFocus
          className="create-doc-input"
        />
        {has_error && <div className="create-doc-error">Doc name is required</div>}

        <fieldset className="create-doc-privacy" aria-describedby={hint_id}>
          <legend>Privacy</legend>
          <div className="create-doc-radios">
            {PRIVACY_OPTIONS.map((option) => (
              <label key={option.value} className="create-doc-radio">
                <input
                  type="radio"
                  name="create-doc-privacy"
                  value={option.value}
                  checked={board_type === option.value}
                  onChange={() => setBoardType(option.value)}
                />
                <span className="create-doc-radio-label">
                  {option.icon}
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <div id={hint_id} className="create-doc-hint">
            {selected_option.hint}
          </div>
        </fieldset>

        <div className="create-doc-footer">
          <button type="button" onClick={onClose} className="create-doc-button create-doc-button--ghost">
            Cancel
          </button>
          <button type="submit" disabled={!can_submit} className="create-doc-button create-doc-button--primary">
            Create Doc
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default CreateDocModal;
