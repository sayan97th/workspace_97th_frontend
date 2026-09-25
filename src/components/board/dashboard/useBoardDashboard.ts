"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { boardViewDataService } from "@/services/board-view-data.service";
import { boardContentService } from "@/services/board-content.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { BoardDashboardConfig, DashboardWidget, DashboardWidgetResult, DashboardWidgetType } from "./types";
import { defaultWidget } from "./widgetCatalog";

export type UseBoardDashboardInput = { board_id: number; view_id: number };

/**
 * Owns a Dashboard tab: its widget list (saved on every change, like a
 * Chart tab) and each widget's computed data. Layout and settings changes
 * show right away, the data is recomputed by the API after each save.
 */
const useBoardDashboard = ({ board_id, view_id }: UseBoardDashboardInput) => {
  const [config, setConfig] = useState<BoardDashboardConfig>({ widgets: [] });
  const [results, setResults] = useState<Record<string, DashboardWidgetResult>>({});
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request_ref = useRef(0);
  const config_ref = useRef(config);
  config_ref.current = config;

  const load = useCallback(async () => {
    const request_id = ++request_ref.current;
    try {
      const data = await boardViewDataService.getDashboard(board_id, view_id);
      if (request_id !== request_ref.current) return;
      setConfig(data.config ?? { widgets: [] });
      setResults(Object.fromEntries(data.widgets.map((widget) => [widget.id, widget])));
      setError(null);
    } catch (caught) {
      if (request_id === request_ref.current) setError(getApiErrorMessage(caught, "Couldn't load this dashboard. Please try again."));
    } finally {
      if (request_id === request_ref.current) setIsLoading(false);
    }
  }, [board_id, view_id]);

  useEffect(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  /** Applies a new widget list locally, saves it, then reloads the computed data. */
  const saveWidgets = useCallback(
    (widgets: DashboardWidget[]) => {
      const next: BoardDashboardConfig = { widgets };
      setConfig(next);
      setIsSaving(true);
      void boardContentService
        .saveView(board_id, view_id, { dashboard_config: next })
        .then(() => load())
        .catch((caught) => setError(getApiErrorMessage(caught, "Couldn't save the dashboard. Please try again.")))
        .finally(() => setIsSaving(false));
    },
    [board_id, view_id, load]
  );

  const addWidget = useCallback(
    (type: DashboardWidgetType): DashboardWidget => {
      const widget = defaultWidget(type);
      saveWidgets([...config_ref.current.widgets, widget]);
      return widget;
    },
    [saveWidgets]
  );

  const updateWidget = useCallback(
    (widget_id: string, partial: Partial<DashboardWidget>) => {
      saveWidgets(config_ref.current.widgets.map((widget) => (widget.id === widget_id ? { ...widget, ...partial } : widget)));
    },
    [saveWidgets]
  );

  const duplicateWidget = useCallback(
    (widget_id: string) => {
      const widgets = config_ref.current.widgets;
      const index = widgets.findIndex((widget) => widget.id === widget_id);
      if (index < 0) return;
      const copy = { ...widgets[index], id: defaultWidget(widgets[index].type).id, title: `${widgets[index].title ?? "Widget"} (copy)` };
      saveWidgets([...widgets.slice(0, index + 1), copy, ...widgets.slice(index + 1)]);
    },
    [saveWidgets]
  );

  const removeWidget = useCallback(
    (widget_id: string) => saveWidgets(config_ref.current.widgets.filter((widget) => widget.id !== widget_id)),
    [saveWidgets]
  );

  const moveWidget = useCallback(
    (widget_id: string, over_id: string) => {
      const widgets = config_ref.current.widgets.slice();
      const from = widgets.findIndex((widget) => widget.id === widget_id);
      const to = widgets.findIndex((widget) => widget.id === over_id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = widgets.splice(from, 1);
      widgets.splice(to, 0, moved);
      saveWidgets(widgets);
    },
    [saveWidgets]
  );

  return { config, results, is_loading, is_saving, error, addWidget, updateWidget, duplicateWidget, removeWidget, moveWidget, refresh: load };
};

export default useBoardDashboard;
