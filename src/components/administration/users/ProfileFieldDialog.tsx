"use client";
import React, { useEffect, useState } from "react";
import { DROPDOWN_OPTION_COLORS } from "@/components/board/table/constants";
import { CloseIcon } from "@/icons/workspace-icons";
import SettingsDropdown from "../SettingsDropdown";
import type {
  ProfileFieldDto,
  ProfileFieldOptionDto,
  ProfileFieldType,
  StoreProfileFieldPayload,
} from "@/types/administration/profile-fields";

export type ProfileFieldDialogProps = {
  /** The field being edited, or null to create a new one. */
  field: ProfileFieldDto | null;
  is_open: boolean;
  onClose: () => void;
  onSave: (payload: StoreProfileFieldPayload) => Promise<void>;
};

export const PROFILE_FIELD_TYPE_LABELS: Record<ProfileFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
};

const type_options = (Object.keys(PROFILE_FIELD_TYPE_LABELS) as ProfileFieldType[]).map((type) => ({
  id: type,
  label: PROFILE_FIELD_TYPE_LABELS[type],
}));

const inputClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[10px] text-[13.5px] text-shell-text placeholder:text-shell-text-faint outline-none focus:border-brand-500";

const newOptionId = (): string => `opt_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Create or edit dialog for a custom profile field. The type is picked once, on creation,
 * since existing values were validated against it; dropdown options can be added, renamed,
 * recolored or removed at any time (removing one clears it from every user).
 */
const ProfileFieldDialog: React.FC<ProfileFieldDialogProps> = ({ field, is_open, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProfileFieldType>("text");
  const [options, setOptions] = useState<ProfileFieldOptionDto[]>([]);
  const [is_saving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!is_open) return;
    setName(field?.name ?? "");
    setType(field?.type ?? "text");
    setOptions(field?.options.length ? field.options : []);
    setIsSaving(false);
  }, [is_open, field]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const clean_options = options.filter((option) => option.label.trim() !== "");
  const can_save = name.trim() !== "" && (type !== "dropdown" || clean_options.length > 0) && !is_saving;

  const addOption = () =>
    setOptions((current) => [
      ...current,
      { id: newOptionId(), label: "", color: DROPDOWN_OPTION_COLORS[current.length % DROPDOWN_OPTION_COLORS.length] },
    ]);

  const updateOption = (id: string, patch: Partial<ProfileFieldOptionDto>) =>
    setOptions((current) => current.map((option) => (option.id === id ? { ...option, ...patch } : option)));

  const cycleColor = (option: ProfileFieldOptionDto) => {
    const index = DROPDOWN_OPTION_COLORS.indexOf(option.color ?? "");
    updateOption(option.id, { color: DROPDOWN_OPTION_COLORS[(index + 1) % DROPDOWN_OPTION_COLORS.length] });
  };

  const submit = async () => {
    if (!can_save) return;
    setIsSaving(true);
    await onSave({
      name: name.trim(),
      type,
      options: type === "dropdown" ? clean_options.map((option) => ({ ...option, label: option.label.trim() })) : undefined,
    });
    setIsSaving(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={field ? "Edit profile field" : "Add profile field"}
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[90vh] w-[460px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-5">
          <span className="text-[18px] font-extrabold tracking-[-0.01em]">{field ? "Edit profile field" : "Add profile field"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <label>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Field name</div>
            <input
              autoFocus
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Office location"
              className={inputClass}
            />
          </label>

          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Type</div>
            {field ? (
              <div className="text-[13.5px] text-shell-text-secondary">
                {PROFILE_FIELD_TYPE_LABELS[field.type]}
                <span className="ml-2 text-[12px] text-shell-text-faint">The type can&apos;t change after creation.</span>
              </div>
            ) : (
              <SettingsDropdown
                value={type}
                options={type_options}
                onChange={(value) => setType(value as ProfileFieldType)}
                className="w-full py-[9px]"
              />
            )}
          </div>

          {type === "dropdown" ? (
            <div>
              <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Options</div>
              <div className="flex flex-col gap-2">
                {options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cycleColor(option)}
                      aria-label="Change color"
                      title="Change color"
                      className="h-[22px] w-[22px] flex-none rounded-md"
                      style={{ backgroundColor: option.color ?? DROPDOWN_OPTION_COLORS[0] }}
                    />
                    <input
                      value={option.label}
                      maxLength={60}
                      onChange={(event) => updateOption(option.id, { label: event.target.value })}
                      placeholder="Option name"
                      className={`${inputClass} py-[8px]`}
                    />
                    <button
                      type="button"
                      onClick={() => setOptions((current) => current.filter((existing) => existing.id !== option.id))}
                      aria-label="Remove option"
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="self-start rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-brand-200 hover:bg-shell-hover"
                >
                  + Add option
                </button>
                {field ? (
                  <p className="text-[11.5px] text-shell-text-faint">
                    Removing an option clears it from every user who had it selected.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[9px] text-[13px] font-semibold text-shell-text-secondary hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!can_save}
            onClick={() => void submit()}
            className="rounded-[9px] bg-brand-500 px-4 py-[9px] text-[13px] font-bold text-white hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_saving ? "Saving…" : field ? "Save changes" : "Add field"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileFieldDialog;
