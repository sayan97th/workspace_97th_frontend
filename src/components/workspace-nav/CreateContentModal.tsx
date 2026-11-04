"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, LockIcon, ShareNodesIcon } from "@/icons/workspace-icons";
import type { BoardType } from "@/types/workspace";
import "./create-doc-modal.css";

export type CreateContentValues = { label: string; board_type: BoardType };

/**
 * What the dialog creates. `noun` fills the copy ("Create Board", "Board name",
 * "Board name is required" and the privacy hints), `default_name` prefills the field.
 */
export type CreateContentKind = {
  noun: string;
  default_name: string;
  /** Folders have no privacy, every other kind asks for Main, Private or Shareable. */
  has_privacy: boolean;
  /** Overrides the "Create {noun}" title, e.g. "Import from Excel". */
  title?: string;
};

export type CreateContentModalProps = {
  is_open: boolean;
  kind: CreateContentKind;
  onSubmit: (values: CreateContentValues) => void | Promise<void>;
  onClose: () => void;
};

type PrivacyOption = { value: BoardType; label: string; icon?: React.ReactNode; hint: (noun: string) => string };

const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: "main", label: "Main", hint: (noun) => `Visible to everyone in your account. Use it to work openly on this ${noun}.` },
  {
    value: "private",
    label: "Private",
    icon: <LockIcon size={14} />,
    hint: (noun) => `Only you and the people you invite can see and open this ${noun}.`,
  },
  {
    value: "shareable",
    label: "Shareable",
    icon: <ShareNodesIcon size={14} />,
    hint: (noun) => `For working privately with guests outside your account on this ${noun}.`,
  },
];

const DEFAULT_BOARD_TYPE: BoardType = "main";
const NAME_MAX_LENGTH = 255;

/** Ready made kinds for the sidebar's create flows. */
export const CREATE_CONTENT_KINDS = {
  board: { noun: "board", default_name: "New Board", has_privacy: true },
  multi_level_board: { noun: "board", default_name: "New Board", has_privacy: true, title: "Create multi-level board" },
  doc: { noun: "doc", default_name: "New Doc", has_privacy: true },
  dashboard: { noun: "dashboard", default_name: "New Dashboard", has_privacy: true },
  project: { noun: "project", default_name: "New Project", has_privacy: true },
  portfolio: { noun: "portfolio", default_name: "New Portfolio", has_privacy: true },
  form: { noun: "form", default_name: "New Form", has_privacy: true },
  canvas: { noun: "canvas", default_name: "New Canvas", has_privacy: true },
  folder: { noun: "folder", default_name: "New Folder", has_privacy: false },
} satisfies Record<string, CreateContentKind>;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * monday.com style "Create ..." dialog shared by every create row of the sidebar
 * ("Add to workspace" menu and a folder's "Add to folder" menu): a name field
 * prefilled and selected, and, for boards, docs and dashboards, the privacy
 * (Main, Private or Shareable) saved as the item's `board_type`. A private item
 * is only visible to its creator, its owner and the people invited to it.
 */
const CreateContentModal: React.FC<CreateContentModalProps> = ({ is_open, kind, onSubmit, onClose }) => {
  const [name, setName] = useState(kind.default_name);
  const [board_type, setBoardType] = useState<BoardType>(DEFAULT_BOARD_TYPE);
  const [is_saving, setIsSaving] = useState(false);
  const [is_touched, setIsTouched] = useState(false);
  const input_ref = useRef<HTMLInputElement>(null);
  const title_id = useId();
  const input_id = useId();
  const hint_id = useId();

  useEffect(() => {
    if (!is_open) return;
    setName(kind.default_name);
    setBoardType(DEFAULT_BOARD_TYPE);
    setIsSaving(false);
    setIsTouched(false);
    // Select the default name so typing replaces it, like monday.
    requestAnimationFrame(() => input_ref.current?.select());
  }, [is_open, kind.default_name]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_saving, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  const noun_title = capitalize(kind.noun);
  const title = kind.title ?? `Create ${noun_title}`;
  const trimmed_name = name.trim();
  const has_error = is_touched && trimmed_name.length === 0;
  const can_submit = trimmed_name.length > 0 && !is_saving;
  const selected_option = PRIVACY_OPTIONS.find((option) => option.value === board_type) ?? PRIVACY_OPTIONS[0];
  const radio_group_name = `${title_id}-privacy`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsTouched(true);
    if (!can_submit) return;
    setIsSaving(true);
    try {
      await onSubmit({ label: trimmed_name, board_type: kind.has_privacy ? board_type : DEFAULT_BOARD_TYPE });
      onClose();
    } catch {
      // The caller reports the error, keep the dialog open so nothing typed is lost.
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="create-doc-theme create-doc-overlay">
      <div className="create-doc-backdrop" onClick={is_saving ? undefined : onClose} aria-hidden="true" />

      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby={title_id} className="create-doc-dialog" noValidate>
        <button type="button" onClick={onClose} disabled={is_saving} aria-label="Close" className="create-doc-close">
          <CloseIcon size={16} />
        </button>

        <h2 id={title_id} className="create-doc-title font-heading">
          {title}
        </h2>

        <label htmlFor={input_id} className="create-doc-label">
          {noun_title} name
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
        {has_error && <div className="create-doc-error">{noun_title} name is required</div>}

        {kind.has_privacy && (
          <fieldset className="create-doc-privacy" aria-describedby={hint_id}>
            <legend>Privacy</legend>
            <div className="create-doc-radios">
              {PRIVACY_OPTIONS.map((option) => (
                <label key={option.value} className="create-doc-radio">
                  <input
                    type="radio"
                    name={radio_group_name}
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
            <div id={hint_id} className="create-doc-hint" aria-live="polite">
              {selected_option.hint(kind.noun)}
            </div>
          </fieldset>
        )}

        <div className="create-doc-footer">
          <button type="button" onClick={onClose} disabled={is_saving} className="create-doc-button create-doc-button--ghost">
            Cancel
          </button>
          <button type="submit" disabled={!can_submit} aria-busy={is_saving} className="create-doc-button create-doc-button--primary">
            {is_saving ? "Creating..." : `Create ${noun_title}`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default CreateContentModal;
