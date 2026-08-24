/**
 * Chart view design tokens. Surfaces/ink resolve through the app's real
 * `--color-shell-*` custom properties (light defaults in `@theme`, dark
 * overrides under `.dark`), mirroring `kanbanDesign.ts`'s `KANBAN_COLORS` —
 * so the chart repaints for dark mode along with the rest of the shell.
 *
 * The 8-hue categorical series palette is the `dataviz` skill's validated
 * default (see `references/palette.md`): fixed slot order is the CVD-safety
 * mechanism, re-confirmed here against this app's actual light (`#ffffff`)
 * and dark (`#0f1c1c`) panel surfaces via `validate_palette.js` — both pass
 * every hard gate (worst adjacent CVD ΔE 9.1 light / 8.4 dark, normal-vision
 * floor 19.6 light / 19.3 dark). Three light-mode slots (aqua/yellow/
 * magenta) sit under 3:1 contrast by design; the "relief rule" mitigation —
 * always-visible legend + tooltip + selective data labels, never color alone
 * — is applied in `useBoardChart`'s Apex options, not by re-stepping hue.
 */
export const CHART_COLORS = {
  surface: "var(--color-shell-panel)",
  grid: "var(--color-shell-border)",
  axis_text: "var(--color-shell-text-muted)",
  tooltip_bg: "var(--color-shell-panel-alt)",
  tooltip_border: "var(--color-shell-border-strong)",
} as const;

/** Fixed categorical order — never cycle or reorder per-chart. Index 0 first, always. */
const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/** A neutral fallback for any series past the validated 8 slots — never a generated/cycled hue (see `dataviz` skill's non-negotiables). Identity for these series rides the legend/tooltip text, not color. */
const OVERFLOW_COLOR = { light: "#9a998f", dark: "#6b6a63" };

export const getCategoricalPalette = (is_dark: boolean): string[] => (is_dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT);

export const getSeriesColor = (index: number, is_dark: boolean): string => {
  const palette = getCategoricalPalette(is_dark);
  return palette[index] ?? (is_dark ? OVERFLOW_COLOR.dark : OVERFLOW_COLOR.light);
};

/** Bar/column cap width, in px — thin marks, never filling the slot (see `marks-and-anatomy.md`). */
export const CHART_BAR_MAX_WIDTH = 24;
export const CHART_BAR_RADIUS = 4;
