/**
 * Gantt sizes, measured from monday.com's Gantt. Colors live as scoped
 * `--gantt-*` tokens in `board-gantt.css`, so the chart repaints for dark
 * mode with the rest of the shell. Bar colors are the one exception: they
 * come from a row's group, status option or the critical path color, which
 * already hold contrast in both themes.
 */

/** Default width of the item list beside the timeline, in px. */
export const GANTT_PANEL_WIDTH = 416;
/** Narrowest and widest the item list can be dragged to, in px. */
export const GANTT_PANEL_MIN_WIDTH = 240;
export const GANTT_PANEL_MAX_WIDTH = 640;
/** Item row height, in px. */
export const GANTT_ROW_HEIGHT = 36;
/** Group row height, it also holds the group summary line, in px. */
export const GANTT_GROUP_HEADER_HEIGHT = 48;
/** Height of each header band (months above weeks), in px. */
export const GANTT_HEADER_ROW_HEIGHT = 33;
/** Bar height within a row, in px. */
export const GANTT_BAR_HEIGHT = 20;
/** Baseline bar height, drawn under the live bar, in px. */
export const GANTT_BASELINE_HEIGHT = 6;
/** Width of a bar's edge drag handle, in px. */
export const GANTT_HANDLE_WIDTH = 7;
/** Narrowest a bar is drawn, so one day bars stay visible at the Years scale, in px. */
export const GANTT_MIN_BAR_WIDTH = 6;
/** Minimum pointer movement, in px, before a bar press counts as a drag rather than a click. */
export const GANTT_DRAG_THRESHOLD = 4;
/** Space left free under the chart when it fills the window, in px. */
export const GANTT_BOTTOM_GAP = 24;
/** The chart never gets shorter than this, in px. */
export const GANTT_MIN_HEIGHT = 480;
