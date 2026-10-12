"use client";
import React, { useState } from "react";
import { Info, Plus, Trash2, X } from "lucide-react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import AdminPageActions from "../AdminPageActions";
import DepartmentMembersModal from "../DepartmentMembersModal";
import type { DepartmentsManagerApi } from "../useDepartmentsManager";

export type DepartmentsSectionProps = {
  departments: DepartmentsManagerApi;
  onGoToUsers: () => void;
};

const GRID_COLUMNS = "grid-cols-[minmax(160px,1fr)_140px_130px_130px_130px_130px]";
const MAX_VISIBLE_OWNERS = 3;

/**
 * Administration > Directory > Departments. Organize the account by department, reserve
 * seats for each one, and delegate member management to department owners, mirroring
 * monday.com's Departments tab. Admins configure everything; an owner only sees the
 * "Members" action for the departments they own.
 */
const DepartmentsSection: React.FC<DepartmentsSectionProps> = ({ departments, onGoToUsers }) => {
  const { hasAnyRole } = useAuth();
  const is_admin = hasAnyRole("super_admin", "admin");
  const [is_unassigned_notice_dismissed, setIsUnassignedNoticeDismissed] = useState(false);

  return (
    <div>
      {departments.error ? (
        <div className="mb-[18px] admin-notice admin-notice-error">
          {departments.error}
        </div>
      ) : null}

      {is_admin ? (
        <AdminPageActions>
          <button
            type="button"
            onClick={() => void departments.addDepartment()}
            disabled={departments.is_adding_department}
            className="admin-button admin-button-primary"
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            Add department
          </button>
        </AdminPageActions>
      ) : null}

      {departments.unassigned_user_count > 0 && !is_unassigned_notice_dismissed ? (
        <div role="status" className="admin-notice admin-notice-neutral mb-6">
          <Info size={18} strokeWidth={1.75} className="flex-none" aria-hidden="true" />
          <span className="min-w-0">
            {departments.unassigned_user_count} users are not assigned to any department. Assign them in{" "}
            <button type="button" onClick={onGoToUsers} className="admin-link">
              User management
            </button>
            .
          </span>
          <button
            type="button"
            onClick={() => setIsUnassignedNoticeDismissed(true)}
            aria-label="Dismiss"
            className="admin-notice-dismiss"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="admin-table">
        <div className="min-w-[860px]">
      <div className={`grid ${GRID_COLUMNS} gap-3.5 admin-table-head`}>
        <span>Name</span>
        <span>Owners</span>
        <span>Reserved seats</span>
        <span>Assigned seats</span>
        <span>Available seats</span>
        <span />
      </div>

      {departments.is_loading ? (
        <div className="admin-table-empty">Loading departments…</div>
      ) : (
        departments.department_rows.map((department) => (
          <div
            key={department.id}
            className={`grid ${GRID_COLUMNS} items-center gap-3.5 admin-table-row`}
          >
            <input
              type="text"
              value={department.name}
              readOnly={!department.can_administer}
              onChange={(event) => departments.renameDepartment(department.id, event.target.value)}
              className="-ml-2 w-full rounded-[4px] border border-transparent bg-transparent px-2 py-[7px] text-[14px] text-shell-text outline-none hover:border-shell-border-strong hover:bg-shell-panel-alt focus:border-shell-border-strong focus:bg-shell-panel-alt read-only:hover:border-transparent read-only:hover:bg-transparent"
            />

            <div className="flex items-center">
              {department.owners.length === 0 ? (
                <span className="text-[12.5px] text-shell-text-faint">No owners</span>
              ) : (
                <div className="flex items-center -space-x-1.5">
                  {department.owners.slice(0, MAX_VISIBLE_OWNERS).map((owner) => (
                    <UserAvatar key={owner.id} user={owner} size={24} className="ring-2 ring-shell-bg" />
                  ))}
                  {department.owners.length > MAX_VISIBLE_OWNERS ? (
                    <span className="z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-shell-hover px-1 text-[10.5px] font-bold text-shell-text-secondary ring-2 ring-shell-bg">
                      {`+${department.owners.length - MAX_VISIBLE_OWNERS}`}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {department.can_administer ? (
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={department.reserved ?? ""}
                placeholder="Unlimited"
                aria-label={`Reserved seats for ${department.name}`}
                onChange={(event) => {
                  const raw_value = event.target.value;
                  departments.updateReservedSeats(
                    department.id,
                    raw_value === "" ? null : Math.max(0, Math.floor(Number(raw_value))),
                  );
                }}
                className="-ml-2 w-full rounded-[4px] border border-transparent bg-transparent px-2 py-[7px] text-[14px] text-shell-text outline-none placeholder:text-shell-text-secondary hover:border-shell-border-strong hover:bg-shell-panel-alt focus:border-shell-border-strong focus:bg-shell-panel-alt"
              />
            ) : (
              <span className="text-[14px]">{department.reserved ?? "Unlimited"}</span>
            )}

            <span
              className={`text-[14px] ${department.over_by > 0 ? "font-semibold text-[var(--admin-danger-text)]" : ""}`}
            >
              {department.assigned}
            </span>
            {department.over_by > 0 ? (
              <span className="admin-pill admin-pill-danger w-fit">
                {`Over by ${department.over_by}`}
              </span>
            ) : (
              <span className="text-[14px]">{department.available ?? "Unlimited"}</span>
            )}

            <div className="flex items-center justify-end gap-1.5">
              {department.can_manage_members ? (
                <button
                  type="button"
                  onClick={() => departments.openMembers(department)}
                  className="rounded-[4px] border border-[var(--admin-border)] px-2.5 py-1 text-[13px] text-shell-text transition-colors hover:bg-[var(--admin-hover)]"
                >
                  Manage
                </button>
              ) : null}
              {department.can_administer ? (
                <button
                  type="button"
                  onClick={() => departments.requestRemoveDepartment(department)}
                  aria-label={`Remove ${department.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-[4px] text-shell-text-secondary hover:bg-[var(--admin-danger-bg)] hover:text-[var(--admin-danger-text)]"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
        </div>
      </div>

      <DepartmentMembersModal members={departments.members} onClose={departments.closeMembers} />

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
};

export default DepartmentsSection;
