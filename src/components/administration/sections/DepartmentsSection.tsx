"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";

export type DepartmentsSectionProps = {
  admin: AdministrationManagerApi;
};

/** Administration > Directory > Departments — organize the account's licenses by department. */
const DepartmentsSection: React.FC<DepartmentsSectionProps> = ({ admin }) => (
  <div>
    <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-[#9aa4a5]">
      Organize your account by location, business unit or cost center, then assign each user in the{" "}
      <button type="button" onClick={() => admin.selectSection("users")} className="text-brand-200 hover:underline">
        Users
      </button>{" "}
      tab.
    </p>

    {admin.unassigned_user_count > 0 ? (
      <div className="mb-[18px] flex items-center gap-[10px] rounded-[9px] bg-brand-200/10 px-[14px] py-3 text-[12.5px] text-[#ffb7ae]">
        <svg width="15" height="15" viewBox="0 0 16 16" className="flex-none text-brand-200">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth={1.3} />
          <line x1="8" y1="7" x2="8" y2="11.2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
        </svg>
        {admin.unassigned_user_count} users are not assigned to any department yet.
      </div>
    ) : null}

    <div className="mb-3.5 flex justify-end">
      <button
        type="button"
        onClick={admin.addDepartment}
        className="flex items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
      >
        <svg width="13" height="13" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
        Add department
      </button>
    </div>

    <div className="grid grid-cols-[minmax(160px,1fr)_130px_130px_130px_34px] gap-3.5 px-2.5 pb-2.5 text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7e8889]">
      <span>Name</span>
      <span>Reserved</span>
      <span>Assigned</span>
      <span>Available</span>
      <span />
    </div>
    <div className="h-px bg-white/[0.07]" />

    {admin.department_rows.map((department) => (
      <div
        key={department.id}
        className="grid grid-cols-[minmax(160px,1fr)_130px_130px_130px_34px] items-center gap-3.5 border-b border-white/[0.045] px-2.5 py-[9px]"
      >
        <input
          type="text"
          value={department.name}
          onChange={(event) => admin.renameDepartment(department.id, event.target.value)}
          className="w-full rounded-[7px] border border-transparent bg-transparent px-2 py-[7px] text-[13.5px] font-semibold text-[#edf1f1] outline-none hover:border-white/[0.12] hover:bg-[#142020] focus:border-white/[0.12] focus:bg-[#142020]"
        />
        <span className="text-[13px] text-[#b7c0c0]">{department.reserved}</span>
        <span className="text-[13px] text-[#b7c0c0]">{department.assigned}</span>
        <span className="text-[13px] text-[#b7c0c0]">{department.available}</span>
        <button
          type="button"
          onClick={() => admin.removeDepartment(department.id)}
          aria-label={`Remove ${department.name}`}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[#9aa4a5] hover:bg-[#e2445c]/10 hover:text-[#e2445c]"
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
    ))}
  </div>
);

export default DepartmentsSection;
