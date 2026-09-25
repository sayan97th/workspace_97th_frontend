"use client";
import React, { useCallback, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { DashboardIcon } from "@/icons/workspace-icons";
import { PlusIcon } from "@/icons/board-icons";
import { useOutsideClick } from "../table/useOutsideClick";
import useBoardDashboard from "./useBoardDashboard";
import WidgetBody from "./widgets/WidgetBody";
import WidgetSettingsDialog from "./WidgetSettingsDialog";
import type { DashboardWidget, DashboardWidgetResult, DashboardWidgetType } from "./types";
import { WIDGET_TYPES, widgetTypeOption } from "./widgetCatalog";

export type BoardDashboardViewProps = {
  board_id: number;
  view_id: number;
  /** Whether the viewer may add, arrange and configure widgets. */
  can_edit: boolean;
  /** Opens an item listed by a widget, on the board and tab that widget reads. */
  onOpenItem?: (target: DashboardItemTarget) => void;
};

export type DashboardItemTarget = { item_id: number; board_id: number; view_id: number | null };

/**
 * The "Dashboard" board view: a grid of widgets (Numbers, Battery, Chart,
 * Status overview, Table, Workload), each reading this board or any other
 * board the viewer can open, like monday.com dashboards. Widgets can be
 * dragged into a new order, resized and configured in place.
 */
const BoardDashboardView: React.FC<BoardDashboardViewProps> = ({ board_id, view_id, can_edit, onOpenItem }) => {
  const dashboard = useBoardDashboard({ board_id, view_id });
  const [editing_widget_id, setEditingWidgetId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (dashboard.is_loading && dashboard.config.widgets.length === 0 && !dashboard.error) return <BoardLoadingSpinner />;
  if (dashboard.error && dashboard.config.widgets.length === 0 && Object.keys(dashboard.results).length === 0) {
    return <CenteredMessage title="Something went wrong" detail={dashboard.error} />;
  }

  const widgets = dashboard.config.widgets;
  const editing_widget = widgets.find((widget) => widget.id === editing_widget_id) ?? null;

  const addWidget = (type: DashboardWidgetType) => {
    const widget = dashboard.addWidget(type);
    setEditingWidgetId(widget.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) dashboard.moveWidget(String(event.active.id), String(event.over.id));
  };

  return (
    <div className="flex flex-col gap-3">
      {dashboard.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-500">{dashboard.error}</div>}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-shell-text-muted">
          {widgets.length} {widgets.length === 1 ? "widget" : "widgets"}
          {dashboard.is_saving && <span className="ml-2 text-shell-text-faint">Saving…</span>}
        </span>
        {can_edit && widgets.length > 0 && <AddWidgetMenu onPick={addWidget} />}
      </div>

      {widgets.length === 0 ? (
        <EmptyDashboard can_edit={can_edit} onPick={addWidget} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {widgets.map((widget) => (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  result={dashboard.results[widget.id]}
                  can_edit={can_edit}
                  onEdit={() => setEditingWidgetId(widget.id)}
                  onDuplicate={() => dashboard.duplicateWidget(widget.id)}
                  onRemove={() => dashboard.removeWidget(widget.id)}
                  onResize={(width) => dashboard.updateWidget(widget.id, { width })}
                  onOpenItem={onOpenItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {can_edit && (
        <WidgetSettingsDialog
          board_id={board_id}
          widget={editing_widget}
          result={editing_widget ? dashboard.results[editing_widget.id] : undefined}
          onChange={dashboard.updateWidget}
          onClose={() => setEditingWidgetId(null)}
        />
      )}
    </div>
  );
};

const WIDTH_CLASS: Record<1 | 2 | 3, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

function WidgetCard({
  widget,
  result,
  can_edit,
  onEdit,
  onDuplicate,
  onRemove,
  onResize,
  onOpenItem,
}: {
  widget: DashboardWidget;
  result: DashboardWidgetResult | undefined;
  can_edit: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onResize: (width: 1 | 2 | 3) => void;
  onOpenItem?: (target: DashboardItemTarget) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !can_edit });
  const width = widget.width ?? 1;
  const source_label = result?.source_board ? `${result.source_board.label}${result.source_views.length > 1 ? ` · ${result.source_views.find((view) => view.id === result.source_view_id)?.label ?? ""}` : ""}` : null;

  return (
    <section
      ref={setNodeRef}
      aria-label={widget.title || widgetTypeOption(widget.type).label}
      className={`group/widget flex min-h-[200px] flex-col rounded-xl border border-shell-border bg-shell-panel ${WIDTH_CLASS[width]} ${isDragging ? "z-10 shadow-xl" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.85 : undefined }}
    >
      <header className="flex items-center gap-2 border-b border-shell-border px-3 py-2.5">
        {can_edit && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Move widget ${widget.title ?? ""}`}
            className="flex h-6 w-4 flex-none cursor-grab items-center justify-center rounded text-shell-text-faint opacity-0 hover:bg-shell-hover focus-visible:opacity-100 group-hover/widget:opacity-100 active:cursor-grabbing"
          >
            <svg viewBox="0 0 6 14" width="6" height="12" aria-hidden>
              {[3, 7, 11].flatMap((cy) => [1.5, 4.5].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.1" fill="currentColor" />))}
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-shell-text">{widget.title || widgetTypeOption(widget.type).label}</h3>
          {source_label && <p className="truncate text-[11.5px] text-shell-text-faint">{source_label}</p>}
        </div>
        {can_edit && <WidgetMenu width={width} onEdit={onEdit} onDuplicate={onDuplicate} onRemove={onRemove} onResize={onResize} />}
      </header>
      <div className="min-h-0 flex-1">
        <WidgetBody
          widget={widget}
          result={result}
          onOpenItem={
            onOpenItem && result?.source_board
              ? (item_id) => onOpenItem({ item_id, board_id: result.source_board!.id, view_id: result.source_view_id })
              : undefined
          }
        />
      </div>
    </section>
  );
}

function WidgetMenu({ width, onEdit, onDuplicate, onRemove, onResize }: { width: 1 | 2 | 3; onEdit: () => void; onDuplicate: () => void; onRemove: () => void; onResize: (width: 1 | 2 | 3) => void }) {
  const [is_open, setIsOpen] = useState(false);
  const [is_confirming, setIsConfirming] = useState(false);
  const close = useCallback(() => {
    setIsOpen(false);
    setIsConfirming(false);
  }, []);
  const ref = useOutsideClick<HTMLDivElement>(is_open, close);

  const item = "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-shell-text hover:bg-shell-hover";
  const pick = (action: () => void) => () => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={is_open}
        aria-label="Widget options"
        className="flex h-7 w-7 items-center justify-center rounded-md text-shell-text-muted hover:bg-shell-hover"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {is_open && (
        <div role="menu" className="absolute right-0 top-8 z-30 w-52 rounded-lg border border-shell-border bg-shell-panel p-1.5 shadow-lg">
          <button type="button" role="menuitem" className={item} onClick={pick(onEdit)}>
            Settings
          </button>
          <button type="button" role="menuitem" className={item} onClick={pick(onDuplicate)}>
            Duplicate
          </button>
          <div className="my-1 border-t border-shell-border" />
          <div className="px-2.5 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-shell-text-faint">Size</div>
          {([1, 2, 3] as const).map((option) => (
            <button key={option} type="button" role="menuitemradio" aria-checked={width === option} className={item} onClick={pick(() => onResize(option))}>
              <span className="flex-1">{option === 1 ? "Small" : option === 2 ? "Medium" : "Full width"}</span>
              {width === option && <span aria-hidden>✓</span>}
            </button>
          ))}
          <div className="my-1 border-t border-shell-border" />
          {is_confirming ? (
            <button type="button" role="menuitem" className={`${item} font-semibold text-red-500`} onClick={pick(onRemove)}>
              Click again to delete
            </button>
          ) : (
            <button type="button" role="menuitem" className={`${item} text-red-500`} onClick={() => setIsConfirming(true)}>
              Delete widget
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddWidgetMenu({ onPick }: { onPick: (type: DashboardWidgetType) => void }) {
  const [is_open, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const ref = useOutsideClick<HTMLDivElement>(is_open, close);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={is_open}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-600"
      >
        <PlusIcon size={12} />
        Add widget
      </button>
      {is_open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-72 rounded-lg border border-shell-border bg-shell-panel p-1.5 shadow-lg">
          {WIDGET_TYPES.map((option) => (
            <button
              key={option.type}
              type="button"
              role="menuitem"
              onClick={() => {
                onPick(option.type);
                setIsOpen(false);
              }}
              className="flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-shell-hover"
            >
              <span className="text-[13px] font-medium text-shell-text">{option.label}</span>
              <span className="text-[12px] text-shell-text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyDashboard({ can_edit, onPick }: { can_edit: boolean; onPick: (type: DashboardWidgetType) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
        <DashboardIcon size={26} />
      </span>
      <h2 className="text-lg font-semibold text-shell-text">Build your dashboard</h2>
      <p className="text-[13.5px] text-shell-text-muted">
        {can_edit ? "Add widgets to follow progress, totals and workload across this board and your other boards." : "No widgets were added to this dashboard yet."}
      </p>
      {can_edit && (
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
          {WIDGET_TYPES.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => onPick(option.type)}
              className="flex flex-col items-start rounded-xl border border-shell-border bg-shell-panel px-3.5 py-3 text-left hover:border-brand-500"
            >
              <span className="text-[13.5px] font-semibold text-shell-text">{option.label}</span>
              <span className="text-[12px] text-shell-text-muted">{option.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default BoardDashboardView;
