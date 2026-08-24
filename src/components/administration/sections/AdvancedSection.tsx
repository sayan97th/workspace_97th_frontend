"use client";
import React from "react";
import SettingsDropdown from "../SettingsDropdown";
import {
  SESSION_INACTIVITY_OPTIONS,
  SESSION_MAX_DURATION_OPTIONS,
  type AdvancedSettingsManagerApi,
} from "../useAdvancedSettingsManager";

export type AdvancedSectionProps = {
  advanced: AdvancedSettingsManagerApi;
};

const inactivity_options = SESSION_INACTIVITY_OPTIONS.map((option) => ({
  id: String(option.minutes),
  label: option.label,
}));
const max_duration_options = SESSION_MAX_DURATION_OPTIONS.map((option) => ({
  id: String(option.minutes),
  label: option.label,
}));

const inputClass =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[10px] text-[13.5px] text-shell-text outline-none focus:border-brand-500";

/** Administration > Security > Advanced — panic mode and session-duration policy. */
const AdvancedSection: React.FC<AdvancedSectionProps> = ({ advanced }) => {
  if (advanced.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading advanced settings…</div>;
  }

  const can_confirm_panic =
    advanced.panic_password.trim() !== "" && advanced.panic_confirmation_phrase === "PANIC";

  return (
    <div className="max-w-[620px]">
      {advanced.error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {advanced.error}
        </div>
      ) : null}

      <div className="mb-7 rounded-xl border border-[#e2445c]/25 bg-shell-panel-alt p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="mb-1.5 text-[15px] font-bold text-shell-text">Panic mode</div>
            <p className="max-w-[400px] text-[13px] leading-relaxed text-shell-text-muted">
              If your team&apos;s login credentials are compromised, lock the account until the threat is
              resolved. Everyone except you will be signed out and unable to sign back in until you
              deactivate it.
            </p>
          </div>

          {advanced.panic_stage === "idle" ? (
            <button
              type="button"
              onClick={advanced.openPanicConfirm}
              className="flex-none whitespace-nowrap rounded-[9px] bg-[#e2445c] px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45]"
            >
              Activate panic mode
            </button>
          ) : null}

          {advanced.panic_stage === "active" ? (
            <div className="flex flex-none items-center gap-2">
              <span className="rounded-lg bg-[#e2445c]/[0.14] px-2.5 py-1.5 text-[12.5px] font-bold text-[#ff8a94]">
                Locked
              </span>
              <button
                type="button"
                onClick={() => void advanced.deactivatePanic()}
                disabled={advanced.is_submitting_panic}
                className="rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[10px] text-[13px] font-semibold text-shell-text-secondary hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
              >
                {advanced.is_submitting_panic ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          ) : null}
        </div>

        {advanced.panic_stage === "confirm" ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-[#e2445c]/25 pt-5">
            {advanced.panic_error ? (
              <div className="rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
                {advanced.panic_error}
              </div>
            ) : null}
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-shell-text-muted">Your password</div>
              <input
                type="password"
                value={advanced.panic_password}
                onChange={(event) => advanced.setPanicPassword(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-shell-text-muted">
                Type PANIC to confirm
              </div>
              <input
                type="text"
                value={advanced.panic_confirmation_phrase}
                onChange={(event) => advanced.setPanicConfirmationPhrase(event.target.value)}
                placeholder="PANIC"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={advanced.cancelPanicConfirm}
                className="rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[10px] text-[13px] font-semibold text-shell-text-secondary hover:bg-shell-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void advanced.confirmActivatePanic()}
                disabled={!can_confirm_panic || advanced.is_submitting_panic}
                className="rounded-[9px] bg-[#e2445c] px-3.5 py-[10px] text-[13px] font-bold text-white hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
              >
                {advanced.is_submitting_panic ? "Activating…" : "Activate panic mode"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-shell-border bg-shell-panel-alt p-5">
        <div className="mb-1.5 text-[15px] font-bold text-shell-text">Session duration</div>
        <p className="mb-[18px] max-w-[460px] text-[13px] leading-relaxed text-shell-text-muted">
          Shorter sessions require users to log in more often, but are more secure.
        </p>

        <div className="flex items-center justify-between gap-4 border-b border-shell-border py-3.5">
          <span className="text-[13.5px] text-shell-text-secondary">Log out users after they&apos;ve been inactive for</span>
          <SettingsDropdown
            value={advanced.session_inactivity_minutes !== null ? String(advanced.session_inactivity_minutes) : null}
            options={inactivity_options}
            onChange={(value) => advanced.setSessionInactivityMinutes(Number(value))}
            className="w-[200px] flex-none"
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3.5">
          <span className="text-[13.5px] text-shell-text-secondary">End session and log out users automatically after</span>
          <SettingsDropdown
            value={advanced.session_max_duration_minutes !== null ? String(advanced.session_max_duration_minutes) : null}
            options={max_duration_options}
            onChange={(value) => advanced.setSessionMaxDurationMinutes(Number(value))}
            className="w-[200px] flex-none"
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void advanced.saveSessionDurations()}
            disabled={!advanced.has_unsaved_changes || advanced.is_saving}
            className="rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {advanced.is_saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSection;
