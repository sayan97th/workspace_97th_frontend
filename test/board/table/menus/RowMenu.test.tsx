import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RowMenu, { describeRecurrence, type RowMenuTarget } from "@/components/board/table/menus/RowMenu";

// RowMenu is built on ActionMenu: every row is a `menuitem`, a disabled row carries `aria-disabled`
// plus its reason as the title, submenus open in a side flyout (a nested `menu` named after the row)
// and the recurring schedule is a form panel (a `group` named after the row).

type Props = React.ComponentProps<typeof RowMenu>;

const MOVE_TARGETS: RowMenuTarget[] = [
  { id: "g1", label: "Group one", current: true },
  { id: "g2", label: "Group two" },
];
const CONVERT_TARGETS: RowMenuTarget[] = [
  { id: "i1", label: "First item" },
  { id: "i2", label: "Second item" },
];

let anchor: HTMLButtonElement;

const buildHandlers = () => ({
  onOpen: vi.fn(),
  onCopyLink: vi.fn(),
  onCreateBelow: vi.fn(),
  onAddSubitem: vi.fn(),
  onDuplicate: vi.fn(),
  onMoveTo: vi.fn(),
  onConvertToItem: vi.fn(),
  onConvertToSubOf: vi.fn(),
  onTogglePriority: vi.fn(),
  onSetRecurrence: vi.fn(),
  onClearRecurrence: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
});

const renderMenu = (overrides: Partial<Props> = {}) => {
  const handlers = buildHandlers();
  render(
    <RowMenu
      is_sub={false}
      anchor_el={anchor}
      move_targets={MOVE_TARGETS}
      convert_targets={CONVERT_TARGETS}
      copied={false}
      is_priority={false}
      recurrence={null}
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
};

const row = (name: string | RegExp) => screen.getByRole("menuitem", { name });
const queryRow = (name: string | RegExp) => screen.queryByRole("menuitem", { name });
const clickRow = (name: string | RegExp) => userEvent.click(row(name));
/** The side flyout a submenu row opened, named after that row. */
const submenu = (name: string) => screen.getByRole("menu", { name });
const recurrencePanel = (name: string | RegExp) => screen.getByRole("group", { name });
const rowLabels = () => screen.getAllByRole("menuitem").map((el) => el.textContent);

beforeEach(() => {
  anchor = document.createElement("button");
  document.body.appendChild(anchor);
});

afterEach(() => {
  anchor.remove();
});

describe("RowMenu labels", () => {
  test("a root item shows every row in monday's order", () => {
    renderMenu();
    expect(screen.getByRole("menu", { name: "Item actions" })).toBeInTheDocument();
    expect(rowLabels()).toEqual([
      "Open item",
      "Copy item link",
      "Mark as priority",
      "Move to",
      "Duplicate",
      "Create new item below",
      "Set recurring",
      "Add subitem",
      "Convert to subitem",
      "Archive",
      "Delete",
    ]);
  });

  test("a subitem gets the subitem wording and no root-only row", () => {
    renderMenu({ is_sub: true, convert_targets: [], onSetRecurrence: undefined });
    expect(screen.getByRole("menu", { name: "Subitem actions" })).toBeInTheDocument();
    expect(rowLabels()).toEqual([
      "Open subitem",
      "Copy subitem link",
      "Mark as priority",
      "Move to",
      "Duplicate",
      "Create new subitem below",
      "Convert to item",
      "Archive",
      "Delete",
    ]);
  });

  test("a subitem never shows the recurring row, even when the caller supports it", () => {
    renderMenu({ is_sub: true, convert_targets: [] });
    expect(queryRow(/recurring/i)).not.toBeInTheDocument();
  });

  test("the priority row reflects the current flag", () => {
    renderMenu({ is_priority: true });
    expect(row("Unmark as priority")).toBeInTheDocument();
    expect(queryRow("Mark as priority")).not.toBeInTheDocument();
  });

  test("the move row is hidden when there is nowhere to move to", () => {
    renderMenu({ move_targets: [] });
    expect(queryRow("Move to")).not.toBeInTheDocument();
  });

  test("the recurring row is hidden when the caller does not support it", () => {
    renderMenu({ onSetRecurrence: undefined });
    expect(queryRow(/recurring/i)).not.toBeInTheDocument();
  });

  test("shows the copied note only when the link was copied", () => {
    renderMenu({ copied: true });
    expect(row(/^Copy item link/)).toHaveTextContent("Copied");
  });

  test("hides the copied note before the link is copied", () => {
    renderMenu();
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  test("Open in new tab and Apps only show when their handlers are passed", () => {
    renderMenu();
    expect(queryRow("Open in new tab")).not.toBeInTheDocument();
    expect(queryRow("Apps")).not.toBeInTheDocument();
  });
});

describe("RowMenu simple actions", () => {
  test("Open item opens the row and closes the menu", async () => {
    const handlers = renderMenu();
    await clickRow("Open item");
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("Open in new tab runs its handler and closes the menu", async () => {
    const onOpenInNewTab = vi.fn();
    const handlers = renderMenu({ onOpenInNewTab });
    await clickRow("Open in new tab");
    expect(onOpenInNewTab).toHaveBeenCalledTimes(1);
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("Copy item link copies and leaves the menu open so the note can show", async () => {
    const handlers = renderMenu();
    await clickRow("Copy item link");
    expect(handlers.onCopyLink).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  test.each([
    ["Mark as priority", "onTogglePriority"],
    ["Create new item below", "onCreateBelow"],
    ["Add subitem", "onAddSubitem"],
    ["Archive", "onArchive"],
    ["Delete", "onDelete"],
  ] as const)("%s runs its handler once and closes the menu", async (name, handler) => {
    const handlers = renderMenu();
    await clickRow(name);
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("Archive and Delete are separate actions", async () => {
    const handlers = renderMenu();
    await clickRow("Archive");
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  test("Apps lists Integrations and Automations", async () => {
    const onOpenIntegrations = vi.fn();
    const onOpenAutomations = vi.fn();
    const handlers = renderMenu({ onOpenIntegrations, onOpenAutomations });
    await clickRow("Apps");
    const apps = submenu("Apps");
    expect(within(apps).getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["Integrations", "Automations"]);
    await userEvent.click(within(apps).getByRole("menuitem", { name: "Automations" }));
    expect(onOpenAutomations).toHaveBeenCalledTimes(1);
    expect(onOpenIntegrations).not.toHaveBeenCalled();
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RowMenu move", () => {
  test("Move to lists every group with the current one marked and disabled", async () => {
    renderMenu();
    await clickRow("Move to");
    const groups = submenu("Move to");
    expect(within(groups).getByText("Move to group")).toBeInTheDocument();
    const current = within(groups).getByRole("menuitem", { name: /^Group one/ });
    expect(current).toHaveAttribute("aria-disabled", "true");
    expect(current).toHaveTextContent("Current");
    expect(within(groups).getByRole("menuitem", { name: "Group two" })).not.toHaveAttribute("aria-disabled");
  });

  test("picking a group moves the item there and closes the menu", async () => {
    const handlers = renderMenu();
    await clickRow("Move to");
    await userEvent.click(within(submenu("Move to")).getByRole("menuitem", { name: "Group two" }));
    expect(handlers.onMoveTo).toHaveBeenCalledWith("g2");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("the current group cannot be picked", async () => {
    const handlers = renderMenu();
    await clickRow("Move to");
    await userEvent.click(within(submenu("Move to")).getByRole("menuitem", { name: /^Group one/ }));
    expect(handlers.onMoveTo).not.toHaveBeenCalled();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  test("a subitem moves to another item", async () => {
    const handlers = renderMenu({
      is_sub: true,
      move_targets: [{ id: "i1", label: "First item", current: true }, { id: "i2", label: "Second item" }],
      convert_targets: [],
    });
    await clickRow("Move to");
    const items = submenu("Move to");
    expect(within(items).getByText("Move to item")).toBeInTheDocument();
    await userEvent.click(within(items).getByRole("menuitem", { name: "Second item" }));
    expect(handlers.onMoveTo).toHaveBeenCalledWith("i2");
  });

  test("hovering another row closes the open submenu", async () => {
    renderMenu();
    await clickRow("Move to");
    expect(row("Move to")).toHaveAttribute("aria-expanded", "true");
    await userEvent.hover(row("Archive"));
    expect(screen.queryByRole("menu", { name: "Move to" })).not.toBeInTheDocument();
    expect(row("Move to")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("RowMenu convert", () => {
  test("Convert to subitem lists the other items and converts to the chosen one", async () => {
    const handlers = renderMenu();
    await clickRow("Convert to subitem");
    const targets = submenu("Convert to subitem");
    expect(within(targets).getByText("Make it a subitem of")).toBeInTheDocument();
    await userEvent.click(within(targets).getByRole("menuitem", { name: "Second item" }));
    expect(handlers.onConvertToSubOf).toHaveBeenCalledWith("i2");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("an item that has subitems cannot be converted and says why", async () => {
    const handlers = renderMenu({ convert_blocked_reason: "Move or delete its subitems first" });
    const convert_row = row("Convert to subitem");
    expect(convert_row).toHaveAttribute("aria-disabled", "true");
    expect(convert_row).toHaveAttribute("title", "Move or delete its subitems first");
    await userEvent.click(convert_row);
    expect(screen.queryByText("Make it a subitem of")).not.toBeInTheDocument();
    expect(handlers.onConvertToSubOf).not.toHaveBeenCalled();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  test("an item with no other item to hang under cannot be converted", () => {
    renderMenu({ convert_targets: [] });
    const convert_row = row("Convert to subitem");
    expect(convert_row).toHaveAttribute("aria-disabled", "true");
    expect(convert_row).toHaveAttribute("title", "There is no other item to convert this into");
  });

  test("a subitem converts straight to an item and closes the menu", async () => {
    const handlers = renderMenu({ is_sub: true, convert_targets: [] });
    const convert_row = row("Convert to item");
    expect(convert_row).not.toHaveAttribute("aria-disabled");
    expect(convert_row).not.toHaveAttribute("aria-haspopup");
    await userEvent.click(convert_row);
    expect(handlers.onConvertToItem).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RowMenu duplicate", () => {
  test("an item can be duplicated with or without its subitems", async () => {
    const handlers = renderMenu();
    await clickRow("Duplicate");
    await userEvent.click(within(submenu("Duplicate")).getByRole("menuitem", { name: "Without subitems" }));
    expect(handlers.onDuplicate).toHaveBeenLastCalledWith(false);
    await clickRow("Duplicate");
    await userEvent.click(within(submenu("Duplicate")).getByRole("menuitem", { name: "With subitems" }));
    expect(handlers.onDuplicate).toHaveBeenLastCalledWith(true);
    expect(handlers.onDuplicate).toHaveBeenCalledTimes(2);
  });

  test("a subitem duplicates straight away, with no submenu", async () => {
    const handlers = renderMenu({ is_sub: true, convert_targets: [] });
    const duplicate_row = row("Duplicate");
    expect(duplicate_row).not.toHaveAttribute("aria-haspopup");
    await userEvent.click(duplicate_row);
    expect(handlers.onDuplicate).toHaveBeenCalledWith(false);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RowMenu recurring", () => {
  test("starts a weekly recurrence every 1 week by default", async () => {
    const handlers = renderMenu();
    await clickRow("Set recurring");
    const panel = recurrencePanel("Set recurring");
    expect(within(panel).getByText("Repeat this item")).toBeInTheDocument();
    expect(within(panel).getByRole("radio", { name: "Week" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(within(panel).getByRole("button", { name: "Start recurring" }));
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("weekly", 1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("sends the interval and frequency the user picked", async () => {
    const handlers = renderMenu();
    await clickRow("Set recurring");
    const panel = recurrencePanel("Set recurring");
    const interval = within(panel).getByRole("spinbutton", { name: "Repeat every" });
    await userEvent.clear(interval);
    await userEvent.type(interval, "3");
    await userEvent.click(within(panel).getByRole("radio", { name: "Month" }));
    expect(within(panel).getByText("A copy of this item is created every 3 months.")).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole("button", { name: "Start recurring" }));
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("monthly", 3);
  });

  test.each([["0", 1], ["", 1], ["-4", 1], ["999", 365]])("an interval of %j is clamped to %i", async (typed, expected) => {
    const handlers = renderMenu();
    await clickRow("Set recurring");
    const panel = recurrencePanel("Set recurring");
    const interval = within(panel).getByRole("spinbutton", { name: "Repeat every" });
    await userEvent.clear(interval);
    if (typed) await userEvent.type(interval, typed);
    await userEvent.click(within(panel).getByRole("button", { name: "Start recurring" }));
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("weekly", expected);
  });

  test("an already recurring item shows its schedule, can be updated and can be stopped", async () => {
    const handlers = renderMenu({ recurrence: { frequency: "daily", interval_count: 5 } });
    const recurring_row = row(/^Recurring/);
    expect(recurring_row).toHaveTextContent("Every 5 days");
    await userEvent.click(recurring_row);

    const panel = recurrencePanel("Recurring");
    expect(within(panel).getByRole("spinbutton", { name: "Repeat every" })).toHaveValue(5);
    expect(within(panel).getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(within(panel).getByRole("button", { name: "Update" }));
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("daily", 5);

    await userEvent.click(within(recurrencePanel("Recurring")).getByRole("button", { name: "Stop recurring" }));
    expect(handlers.onClearRecurrence).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(2);
  });

  test("an item that is not recurring has no Stop recurring button", async () => {
    renderMenu();
    await clickRow("Set recurring");
    expect(within(recurrencePanel("Set recurring")).queryByRole("button", { name: "Stop recurring" })).not.toBeInTheDocument();
  });

  test("offers the three frequencies", async () => {
    renderMenu();
    await clickRow("Set recurring");
    const options = within(recurrencePanel("Set recurring")).getAllByRole("radio").map((option) => option.textContent);
    expect(options).toEqual(["Day", "Week", "Month"]);
  });
});

describe("describeRecurrence", () => {
  test.each([
    ["daily", 1, "Every day"],
    ["weekly", 1, "Every week"],
    ["weekly", 2, "Every 2 weeks"],
    ["monthly", 6, "Every 6 months"],
  ] as const)("%s every %i reads %j", (frequency, interval_count, expected) => {
    expect(describeRecurrence(frequency, interval_count)).toBe(expected);
  });
});
