"use client";
import React, { useState } from "react";
import type { ColumnDef, PersonDef } from "../table/types";
import type { BoardAutomationDto, CreateBoardAutomationPayload } from "@/types/board-automation";

export type AutomationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  automations: BoardAutomationDto[];
  /** This tab's item-scope columns, for the trigger/notify-target pickers. */
  columns: ColumnDef[];
  groups: { id: string; label: string }[];
  people: PersonDef[];
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
};

type Recipe = "status_changed" | "date_arrived";

const ROW = "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";
const LABEL = "mb-1.5 mt-3 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint first:mt-0";

/** Describes one automation as a plain-English sentence for the list view. */
function describeAutomation(automation: BoardAutomationDto, columns: ColumnDef[], groups: { id: string; label: string }[], people: PersonDef[]): string {
  const trigger_column = columns.find((c) => c.id === String(automation.trigger_column_id));
  const trigger_label = trigger_column?.title ?? "a column";

  const trigger_text =
    automation.trigger_type === "status_changed"
      ? `When ${trigger_label} changes to "${trigger_column?.options?.find((o) => o.id === automation.trigger_value)?.label ?? automation.trigger_value}"`
      : `When ${trigger_label} arrives`;

  const action_text =
    automation.action_type === "move_to_group"
      ? `move the item to "${groups.find((g) => g.id === String(automation.action_params.target_group_id))?.label ?? "a table"}"`
      : automation.action_params.notify_user_id
        ? `notify ${people.find((p) => p.id === String(automation.action_params.notify_user_id))?.name ?? "a person"}`
        : `notify whoever is assigned in "${columns.find((c) => c.id === String(automation.action_params.notify_from_people_column_id))?.title ?? "a column"}"`;

  return `${trigger_text}, ${action_text}.`;
}

/** Board header's "Automate" button — lists this tab's rule-based (no AI) automations and lets the user add/enable/disable/delete them. */
export default function AutomationsModal({ is_open, onClose, automations, columns, groups, people, onCreate, onToggle, onDelete }: AutomationsModalProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  if (!is_open) return null;

  const close = () => {
    setRecipe(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-[480px] flex-col rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-boardtree-border-soft px-5 py-4">
          <div className="flex items-center gap-2">
            {recipe && (
              <button type="button" onClick={() => setRecipe(null)} className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover">
                <svg viewBox="0 0 12 12" width="10" height="10"><path d="M7.5 3 L4.3 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            <div className="text-[15px] font-semibold text-boardtree-text">Automations</div>
          </div>
          <button type="button" onClick={close} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!recipe && (
            <>
              <div className="mb-3 flex flex-col gap-2">
                {automations.length === 0 && <div className="text-[12.5px] text-boardtree-text-faint">No automations on this table yet.</div>}
                {automations.map((automation) => (
                  <div key={automation.id} className="flex items-start gap-2.5 rounded-[8px] border border-boardtree-border-soft px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => void onToggle(automation.id, !automation.is_enabled)}
                      className={`mt-0.5 flex h-5 w-9 flex-none items-center rounded-full px-0.5 transition-colors ${automation.is_enabled ? "justify-end bg-boardtree-accent" : "justify-start bg-boardtree-track"}`}
                    >
                      <span className="h-4 w-4 rounded-full bg-white" />
                    </button>
                    <div className="min-w-0 flex-1 text-[13px] text-boardtree-text">{describeAutomation(automation, columns, groups, people)}</div>
                    <button type="button" onClick={() => void onDelete(automation.id)} className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-danger-hover hover:text-boardtree-danger">
                      <svg viewBox="0 0 16 16" width="13" height="13"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                ))}
              </div>

              <div className={LABEL}>Add a new automation</div>
              <button type="button" onClick={() => setRecipe("status_changed")} className={`${ROW} border border-boardtree-border-soft`}>
                <span className="flex-1">When a Status/Label changes, move the item to a table</span>
              </button>
              <div className="h-1.5" />
              <button type="button" onClick={() => setRecipe("date_arrived")} className={`${ROW} border border-boardtree-border-soft`}>
                <span className="flex-1">When a Date arrives, notify someone</span>
              </button>
            </>
          )}

          {recipe === "status_changed" && (
            <StatusChangedForm
              columns={columns}
              groups={groups}
              is_saving={is_saving}
              onSave={async (payload) => {
                setIsSaving(true);
                try {
                  await onCreate(payload);
                  setRecipe(null);
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          )}

          {recipe === "date_arrived" && (
            <DateArrivedForm
              columns={columns}
              people={people}
              is_saving={is_saving}
              onSave={async (payload) => {
                setIsSaving(true);
                try {
                  await onCreate(payload);
                  setRecipe(null);
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const SAVE_BUTTON = "mt-4 flex h-9 w-full items-center justify-center rounded-[7px] bg-boardtree-accent text-[13px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";

function StatusChangedForm({
  columns, groups, is_saving, onSave,
}: {
  columns: ColumnDef[];
  groups: { id: string; label: string }[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const trigger_columns = columns.filter((c) => c.kind === "status" || c.kind === "label");
  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const trigger_column = trigger_columns.find((c) => c.id === column_id);
  const [option_id, setOptionId] = useState(trigger_column?.options?.[0]?.id ?? "");
  const [group_id, setGroupId] = useState(groups[0]?.id ?? "");

  const can_save = !!column_id && !!option_id && !!group_id;

  return (
    <>
      <div className={LABEL}>When column</div>
      <div className="flex flex-col gap-0.5">
        {trigger_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => { setColumnId(c.id); setOptionId(c.options?.[0]?.id ?? ""); }} className={ROW}>
            <Radio checked={column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {trigger_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Status or Label column to this table first.</div>}
      </div>

      {trigger_column && (
        <>
          <div className={LABEL}>Changes to</div>
          <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {(trigger_column.options ?? []).map((option) => (
              <button key={option.id} type="button" onClick={() => setOptionId(option.id)} className={ROW}>
                <Radio checked={option_id === option.id} />
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: option.color }} />
                <span className="flex-1 truncate">{option.label || "(blank)"}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={LABEL}>Move the item to</div>
      <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
        {groups.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroupId(g.id)} className={ROW}>
            <Radio checked={group_id === g.id} />
            <span className="flex-1 truncate">{g.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "status_changed",
            trigger_column_id: Number(column_id),
            trigger_value: option_id,
            action_type: "move_to_group",
            action_params: { target_group_id: Number(group_id) },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

function DateArrivedForm({
  columns, people, is_saving, onSave,
}: {
  columns: ColumnDef[];
  people: PersonDef[];
  is_saving: boolean;
  onSave: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
}) {
  const trigger_columns = columns.filter((c) => c.kind === "date");
  const people_columns = columns.filter((c) => c.kind === "people");
  const [column_id, setColumnId] = useState(trigger_columns[0]?.id ?? "");
  const [notify_mode, setNotifyMode] = useState<"person" | "column">(people_columns.length > 0 ? "column" : "person");
  const [notify_person_id, setNotifyPersonId] = useState(people[0]?.id ?? "");
  const [notify_column_id, setNotifyColumnId] = useState(people_columns[0]?.id ?? "");

  const can_save = !!column_id && (notify_mode === "person" ? !!notify_person_id : !!notify_column_id);

  return (
    <>
      <div className={LABEL}>When date column</div>
      <div className="flex flex-col gap-0.5">
        {trigger_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => setColumnId(c.id)} className={ROW}>
            <Radio checked={column_id === c.id} />
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
        {trigger_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Add a Date column to this table first.</div>}
      </div>

      <div className={LABEL}>Notify</div>
      <div className="flex flex-col gap-0.5">
        <button type="button" onClick={() => setNotifyMode("column")} disabled={people_columns.length === 0} className={`${ROW} disabled:opacity-40`}>
          <Radio checked={notify_mode === "column"} />
          <span className="flex-1">Whoever is assigned</span>
        </button>
        {notify_mode === "column" && (
          <div className="ml-6 flex flex-col gap-0.5">
            {people_columns.map((c) => (
              <button key={c.id} type="button" onClick={() => setNotifyColumnId(c.id)} className={ROW}>
                <Radio checked={notify_column_id === c.id} />
                <span className="flex-1 truncate">in "{c.title}"</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setNotifyMode("person")} className={ROW}>
          <Radio checked={notify_mode === "person"} />
          <span className="flex-1">A specific person</span>
        </button>
        {notify_mode === "person" && (
          <div className="ml-6 flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {people.map((p) => (
              <button key={p.id} type="button" onClick={() => setNotifyPersonId(p.id)} className={ROW}>
                <Radio checked={notify_person_id === p.id} />
                <span className="flex-1 truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!can_save || is_saving}
        onClick={() =>
          void onSave({
            trigger_type: "date_arrived",
            trigger_column_id: Number(column_id),
            action_type: "notify_person",
            action_params:
              notify_mode === "person"
                ? { notify_user_id: Number(notify_person_id) }
                : { notify_from_people_column_id: Number(notify_column_id) },
          })
        }
        className={SAVE_BUTTON}
      >
        Create automation
      </button>
    </>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${checked ? "border-boardtree-accent" : "border-boardtree-border"}`}>
      {checked && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
    </span>
  );
}
