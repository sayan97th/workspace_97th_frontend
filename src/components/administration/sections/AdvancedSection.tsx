"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import SettingsDropdown from "../SettingsDropdown";
import { ADMIN_SESSION_INACTIVITY_OPTIONS, ADMIN_SESSION_MAX_OPTIONS } from "@/data/administration-data";

export type AdvancedSectionProps = {
  admin: AdministrationManagerApi;
};

const inactivity_options = ADMIN_SESSION_INACTIVITY_OPTIONS.map((value) => ({ id: value, label: value }));
const max_duration_options = ADMIN_SESSION_MAX_OPTIONS.map((value) => ({ id: value, label: value }));

/** Administration > Security > Advanced — panic mode and session-duration policy. */
const AdvancedSection: React.FC<AdvancedSectionProps> = ({ admin }) => (
  <div className="max-w-[620px]">
    <div className="mb-7 flex items-start justify-between gap-5 rounded-xl border border-[#e2445c]/25 bg-[#0b1616] p-5">
      <div>
        <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">Panic mode</div>
        <p className="max-w-[400px] text-[13px] leading-relaxed text-[#9aa4a5]">
          If your team&apos;s login credentials are compromised, lock the account until the threat is
          resolved.
        </p>
      </div>

      {admin.panic_stage === "idle" ? (
        <button
          type="button"
          onClick={admin.openPanicConfirm}
          className="flex-none whitespace-nowrap rounded-[9px] bg-[#e2445c] px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45]"
        >
          Activate Panic mode
        </button>
      ) : null}

      {admin.panic_stage === "confirm" ? (
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={admin.cancelPanicConfirm}
            className="rounded-[9px] border border-white/[0.12] bg-[#142020] px-3.5 py-[10px] text-[13px] font-semibold text-[#d7dcdc] hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={admin.confirmPanic}
            className="rounded-[9px] bg-[#e2445c] px-3.5 py-[10px] text-[13px] font-bold text-white hover:bg-[#c22d45]"
          >
            Confirm
          </button>
        </div>
      ) : null}

      {admin.panic_stage === "active" ? (
        <div className="flex flex-none items-center gap-2">
          <span className="rounded-lg bg-[#e2445c]/[0.14] px-2.5 py-1.5 text-[12.5px] font-bold text-[#ff8a94]">
            Locked
          </span>
          <button
            type="button"
            onClick={admin.deactivatePanic}
            className="rounded-[9px] border border-white/[0.12] bg-[#142020] px-3.5 py-[10px] text-[13px] font-semibold text-[#d7dcdc] hover:bg-white/[0.08]"
          >
            Deactivate
          </button>
        </div>
      ) : null}
    </div>

    <div className="rounded-xl border border-white/[0.08] bg-[#0b1616] p-5">
      <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">Session duration</div>
      <p className="mb-[18px] max-w-[460px] text-[13px] leading-relaxed text-[#9aa4a5]">
        Shorter sessions require users to log in more often, but are more secure.
      </p>

      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3.5">
        <span className="text-[13.5px] text-[#d7dcdc]">Log out users after they&apos;ve been inactive for</span>
        <SettingsDropdown
          value={admin.session_inactivity}
          options={inactivity_options}
          onChange={admin.setSessionInactivity}
          className="w-[200px] flex-none"
        />
      </div>

      <div className="flex items-center justify-between gap-4 py-3.5">
        <span className="text-[13.5px] text-[#d7dcdc]">End session and log out users automatically after</span>
        <SettingsDropdown
          value={admin.session_max_duration}
          options={max_duration_options}
          onChange={admin.setSessionMaxDuration}
          className="w-[200px] flex-none"
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="rounded-[9px] bg-brand-500 px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default AdvancedSection;
