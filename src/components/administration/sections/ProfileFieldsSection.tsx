"use client";
import React, { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/context/AuthContext";
import { DragHandleIcon } from "@/icons/board-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import ProfileFieldDialog, { PROFILE_FIELD_TYPE_LABELS } from "../users/ProfileFieldDialog";
import { useProfileFieldsManager } from "../useProfileFieldsManager";
import type { ProfileFieldDto } from "@/types/administration/profile-fields";

const GRID = "grid grid-cols-[28px_minmax(180px,1.4fr)_120px_minmax(180px,1.6fr)_110px_120px] gap-3";

const FieldRow: React.FC<{
  field: ProfileFieldDto;
  can_manage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ field, can_manage, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: !can_manage,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${GRID} items-center border-b border-shell-border bg-shell-bg px-2.5 py-[11px] text-[12.5px] ${
        isDragging ? "relative z-10 shadow-xl shadow-black/30" : ""
      }`}
    >
      <span>
        {can_manage ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${field.name}`}
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-shell-text-faint hover:bg-shell-hover active:cursor-grabbing"
          >
            <DragHandleIcon size={13} />
          </button>
        ) : null}
      </span>
      <span className="truncate text-[13.5px] font-semibold text-shell-text">{field.name}</span>
      <span>
        <span className="rounded-md bg-shell-hover-strong px-2 py-0.5 text-[11.5px] font-bold text-shell-text-secondary">
          {PROFILE_FIELD_TYPE_LABELS[field.type]}
        </span>
      </span>
      <span className="flex min-w-0 flex-wrap gap-1">
        {field.type === "dropdown" ? (
          field.options.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-md border border-shell-border px-1.5 py-px text-[11.5px] text-shell-text-secondary"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.color ?? "#579bfc" }} />
              {option.label}
            </span>
          ))
        ) : (
          <span className="text-shell-text-faint">Free {field.type === "text" ? "text" : field.type} value</span>
        )}
      </span>
      <span className="text-shell-text-muted">{field.values_count ?? 0} users</span>
      <span className="flex justify-end gap-1.5">
        {can_manage ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 py-1.5 text-[11.5px] font-semibold text-shell-text-secondary hover:bg-shell-hover"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#ff8a94] hover:bg-[#e2445c]/[0.12]"
            >
              Delete
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
};

/**
 * Administration > Customization > Profile fields, monday's "Customize user profile
 * fields": extra fields every user profile gets (text, number, date or dropdown), editable
 * by admins from the user details drawer and filterable as columns in the Users table.
 */
const ProfileFieldsSection: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const can_manage = hasAnyRole("super_admin", "admin");
  const manager = useProfileFieldsManager();
  const [editing, setEditing] = useState<ProfileFieldDto | "new" | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = manager.fields.map((field) => field.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    void manager.reorder(arrayMove(ids, from, to));
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-5">
        <p className="max-w-[560px] text-[13px] leading-relaxed text-shell-text-muted">
          Add fields to every user&apos;s profile, like office location, employee ID or start date. Admins fill them in
          from the user details panel, and each field becomes a filterable column in the Users table.
        </p>
        {can_manage ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex flex-none items-center gap-[7px] rounded-lg bg-brand-500 px-4 py-[9px] text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            <svg width="13" height="13" viewBox="0 0 16 16">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
            Add field
          </button>
        ) : null}
      </div>

      {manager.error ? (
        <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {manager.error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={`${GRID} px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint`}>
            <span />
            <span>Field</span>
            <span>Type</span>
            <span>Options</span>
            <span>Filled in</span>
            <span />
          </div>
          <div className="h-px bg-shell-hover" />

          {manager.is_loading ? (
            <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading profile fields…</div>
          ) : manager.fields.length === 0 ? (
            <div className="px-2.5 py-10 text-center text-[13px] text-shell-text-faint">
              No custom profile fields yet.{can_manage ? " Add one to get started." : ""}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={manager.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                {manager.fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    can_manage={can_manage}
                    onEdit={() => setEditing(field)}
                    onDelete={() => manager.requestDelete(field)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <ProfileFieldDialog
        field={editing === "new" ? null : editing}
        is_open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={async (payload) => {
          const saved = await manager.saveField(editing === "new" || editing === null ? null : editing.id, payload);
          if (saved) setEditing(null);
        }}
      />

      <ConfirmActionModal
        is_open={manager.field_pending_delete !== null}
        title="Delete profile field"
        description={`"${manager.field_pending_delete?.name ?? ""}" and every user's value for it will be removed. This can't be undone.`}
        confirm_label="Delete field"
        variant="danger"
        onConfirm={manager.confirmDelete}
        onClose={manager.closeDelete}
      />
    </div>
  );
};

export default ProfileFieldsSection;
