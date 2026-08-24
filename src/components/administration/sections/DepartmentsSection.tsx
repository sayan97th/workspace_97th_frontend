"use client";
import React from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import type { DepartmentsManagerApi } from "../useDepartmentsManager";

export type DepartmentsSectionProps = {
  departments: DepartmentsManagerApi;
  onGoToUsers: () => void;
};

/** Administration > Directory > Departments — organize the account's licenses by department. */
const DepartmentsSection: React.FC<DepartmentsSectionProps> = ({ departments, onGoToUsers }) => (
  <div>
    <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
      Organize your account by location, business unit or cost center, then assign each user in the{" "}
      <button type="button" onClick={onGoToUsers} className="text-brand-200 hover:underline">
        Users
      </button>{" "}
      tab.
    </p>

    {departments.error ? (
      <div className="mb-[18px] rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
        {departments.error}
      </div>
    ) : null}

    {departments.unassigned_user_count > 0 ? (
      <div className="mb-[18px] flex items-center gap-[10px] rounded-[9px] bg-brand-200/10 px-[14px] py-3 text-[12.5px] text-[#ffb7ae]">
        <svg width="15" height="15" viewBox="0 0 16 16" className="flex-none text-brand-200">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth={1.3} />
          <line x1="8" y1="7" x2="8" y2="11.2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
        </svg>
        {departments.unassigned_user_count} users are not assigned to any department yet.
      </div>
    ) : null}

    <div className="mb-3.5 flex justify-end">
      <button
        type="button"
        onClick={() => void departments.addDepartment()}
        disabled={departments.is_adding_department}
        className="flex items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
      >
        <svg width="13" height="13" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
        Add department
      </button>
    </div>

    <div className="grid grid-cols-[minmax(160px,1fr)_130px_130px_130px_34px] gap-3.5 px-2.5 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
      <span>Name</span>
      <span>Reserved</span>
      <span>Assigned</span>
      <span>Available</span>
      <span />
    </div>
    <div className="h-px bg-shell-hover" />

    {departments.is_loading ? (
      <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading departments…</div>
    ) : (
      departments.department_rows.map((department) => (
        <div
          key={department.id}
          className="grid grid-cols-[minmax(160px,1fr)_130px_130px_130px_34px] items-center gap-3.5 border-b border-shell-border px-2.5 py-[9px]"
        >
          <input
            type="text"
            value={department.name}
            onChange={(event) => departments.renameDepartment(department.id, event.target.value)}
            className="w-full rounded-[7px] border border-transparent bg-transparent px-2 py-[7px] text-[13.5px] font-semibold text-shell-text outline-none hover:border-shell-border-strong hover:bg-shell-panel-alt focus:border-shell-border-strong focus:bg-shell-panel-alt"
          />
          <span className="text-[13px] text-shell-text-secondary">{department.reserved ?? "Unlimited"}</span>
          <span className="text-[13px] text-shell-text-secondary">{department.assigned}</span>
          <span className="text-[13px] text-shell-text-secondary">{department.available ?? "Unlimited"}</span>
          <button
            type="button"
            onClick={() => departments.requestRemoveDepartment(department)}
            aria-label={`Remove ${department.name}`}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-[#e2445c]/10 hover:text-[#e2445c]"
          >
            <svg width="13" height="13" viewBox="0 0 16 16">
              <path
                d="M3 4.5h10M6.5 4.5V3.2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.3M4.3 4.5l.6 8.3a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.6-8.3"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ))
    )}

    <ConfirmActionModal
      is_open={departments.department_pending_delete !== null}
      title="Delete department"
      description={`"${departments.department_pending_delete?.name}" will be permanently deleted. Users assigned to it will show as unassigned.`}
      confirm_label="Delete department"
      danger
      onConfirm={departments.confirmRemoveDepartment}
      onClose={departments.cancelRemoveDepartment}
    />
  </div>
);

export default DepartmentsSection;
