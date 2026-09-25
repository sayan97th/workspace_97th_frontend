"use client";
import React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { DragHandleIcon } from "@/icons/board-icons";
import { DEFAULT_SIDEBAR_PREFERENCES, SIDEBAR_SECTION_LABELS } from "./sidebarConstants";
import type { SidebarSectionPreference } from "@/types/auth";

export type SidebarCustomizePanelProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  sections: SidebarSectionPreference[];
  onChange: (sections: SidebarSectionPreference[]) => void;
};

const SectionRow: React.FC<{ section: SidebarSectionPreference; onToggle: () => void }> = ({ section, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const label = SIDEBAR_SECTION_LABELS[section.key];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex h-9 items-center gap-2 rounded-lg px-1.5 ${isDragging ? "relative z-10 bg-shell-hover-strong shadow-lg" : "hover:bg-shell-hover"}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className="flex h-6 w-5 flex-none cursor-grab items-center justify-center rounded text-shell-text-muted active:cursor-grabbing"
      >
        <DragHandleIcon size={10} />
      </button>
      <span className={`flex-1 text-[13.5px] ${section.is_visible ? "text-shell-text" : "text-shell-text-faint"}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={section.is_visible}
        aria-label={`Show ${label}`}
        onClick={onToggle}
        className={`relative h-[18px] w-8 flex-none rounded-full transition-colors ${section.is_visible ? "bg-[#2B76E5]" : "bg-shell-border-strong"}`}
      >
        <span
          className={`absolute left-0 top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-150 ${section.is_visible ? "translate-x-[16px]" : "translate-x-[2px]"}`}
        />
      </button>
    </li>
  );
};

/**
 * "Customize sidebar": drag the personal sections (Home, My work, Favorites,
 * Recent) into any order and switch each one on or off. Every change is
 * saved on the account right away (see `SidebarContext`).
 */
const SidebarCustomizePanel: React.FC<SidebarCustomizePanelProps> = ({ anchor_el, is_open, onClose, sections, onChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((section) => section.key === active.id);
    const to = sections.findIndex((section) => section.key === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(sections, from, to));
  };

  const is_default = JSON.stringify(sections) === JSON.stringify(DEFAULT_SIDEBAR_PREFERENCES.sections);

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={250} align="start">
      <div className="p-2">
        <div className="px-1.5 pb-1 pt-1 font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">CUSTOMIZE SIDEBAR</div>
        <p className="px-1.5 pb-2 text-[12px] leading-snug text-shell-text-faint">Drag to reorder, switch off what you don&apos;t use.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((section) => section.key)} strategy={verticalListSortingStrategy}>
            <ul className="relative flex flex-col gap-0.5">
              {sections.map((section) => (
                <SectionRow
                  key={section.key}
                  section={section}
                  onToggle={() =>
                    onChange(sections.map((candidate) => (candidate.key === section.key ? { ...candidate, is_visible: !candidate.is_visible } : candidate)))
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          disabled={is_default}
          onClick={() => onChange(DEFAULT_SIDEBAR_PREFERENCES.sections)}
          className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-medium text-shell-text transition-colors hover:bg-shell-hover-strong disabled:cursor-default disabled:text-shell-text-faint disabled:hover:bg-transparent"
        >
          Reset to default
        </button>
      </div>
    </BoardPopover>
  );
};

export default SidebarCustomizePanel;
