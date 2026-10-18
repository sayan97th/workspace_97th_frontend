import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupMenu from "@/components/board/table/menus/GroupMenu";
import { GROUP_PALETTE } from "@/components/board/table/constants";

type Props = React.ComponentProps<typeof GroupMenu>;

let anchor: HTMLButtonElement;

const buildHandlers = () => ({
  onToggleThis: vi.fn(),
  onToggleAllGroups: vi.fn(),
  onSelectAll: vi.fn(),
  onExpandSubitems: vi.fn(),
  onCollapseSubitems: vi.fn(),
  onAddGroup: vi.fn(),
  onDuplicate: vi.fn(),
  onMove: vi.fn(),
  onRename: vi.fn(),
  onChangeColor: vi.fn(),
  onTogglePriority: vi.fn(),
  onExportExcel: vi.fn(),
  onOpenIntegrations: vi.fn(),
  onOpenAutomations: vi.fn(),
  onDelete: vi.fn(),
  onArchive: vi.fn(),
  onClose: vi.fn(),
});

const renderMenu = (overrides: Partial<Props> = {}) => {
  const handlers = buildHandlers();
  render(
    <GroupMenu
      anchor_el={anchor}
      is_collapsed={false}
      are_all_collapsed={false}
      is_first={false}
      is_last={false}
      current_color={GROUP_PALETTE[0]}
      is_priority={false}
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
};

const row = (name: string) => screen.getByRole("menuitem", { name });
const clickRow = (name: string) => userEvent.click(row(name));

beforeEach(() => {
  anchor = document.createElement("button");
  document.body.appendChild(anchor);
});

afterEach(() => {
  anchor.remove();
});

describe("Group menu rows", () => {
  test("shows every row in monday's order", () => {
    renderMenu();
    const labels = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(labels).toEqual([
      "Collapse this group",
      "Collapse all groups",
      "Select all items in group",
      "Expand all subitems",
      "Collapse all subitems",
      "Add group",
      "Mark as priority client",
      "Duplicate this group",
      "Move group",
      "Rename group",
      "Change group color",
      "Export to Excel",
      "Apps",
      "Delete group",
      "Archive group",
    ]);
  });

  test("the collapse rows and the priority row reflect the board's state", () => {
    renderMenu({ is_collapsed: true, are_all_collapsed: true, is_priority: true });
    expect(row("Expand this group")).toBeInTheDocument();
    expect(row("Expand all groups")).toBeInTheDocument();
    expect(row("Unmark as priority client")).toBeInTheDocument();
  });

  test("Export to Excel and Apps hide when their actions are omitted", () => {
    renderMenu({ onExportExcel: undefined, onOpenIntegrations: undefined, onOpenAutomations: undefined });
    expect(screen.queryByRole("menuitem", { name: "Export to Excel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Apps" })).not.toBeInTheDocument();
  });

  test.each([
    ["Collapse this group", "onToggleThis"],
    ["Collapse all groups", "onToggleAllGroups"],
    ["Select all items in group", "onSelectAll"],
    ["Expand all subitems", "onExpandSubitems"],
    ["Collapse all subitems", "onCollapseSubitems"],
    ["Add group", "onAddGroup"],
    ["Mark as priority client", "onTogglePriority"],
    ["Rename group", "onRename"],
    ["Export to Excel", "onExportExcel"],
    ["Delete group", "onDelete"],
    ["Archive group", "onArchive"],
  ] as const)("%s runs its own action and closes the menu", async (label, handler) => {
    const handlers = renderMenu();
    await clickRow(label);
    expect(handlers[handler]).toHaveBeenCalledOnce();
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  test("Archive group never triggers the delete action", async () => {
    const handlers = renderMenu();
    await clickRow("Archive group");
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });
});

describe("Change group color", () => {
  const swatches = () => screen.queryAllByRole("radio", { name: /^Set group color to / });

  test("hovering the row opens the palette", async () => {
    renderMenu();
    expect(swatches()).toHaveLength(0);
    await userEvent.hover(row("Change group color"));
    expect(swatches()).toHaveLength(GROUP_PALETTE.length);
  });

  test("picking a swatch reports that color and closes the menu", async () => {
    const handlers = renderMenu();
    await userEvent.hover(row("Change group color"));
    await userEvent.click(screen.getByRole("radio", { name: "Set group color to #e04455" }));
    expect(handlers.onChangeColor).toHaveBeenCalledExactlyOnceWith("#e04455");
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  test("the current color is checked", async () => {
    renderMenu({ current_color: "#e04455" });
    await userEvent.hover(row("Change group color"));
    expect(screen.getByRole("radio", { name: "Set group color to #e04455" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Set group color to #4f6bed" })).toHaveAttribute("aria-checked", "false");
  });

  test("hovering another row closes the palette", async () => {
    renderMenu();
    await userEvent.hover(row("Change group color"));
    await userEvent.hover(row("Rename group"));
    expect(swatches()).toHaveLength(0);
  });
});

describe("Move group", () => {
  test("offers the four moves and reports the one picked", async () => {
    const handlers = renderMenu();
    await userEvent.hover(row("Move group"));
    await clickRow("Move to bottom");
    expect(handlers.onMove).toHaveBeenCalledExactlyOnceWith("bottom");
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  test("the first group cannot move up or to the top, and says why", async () => {
    const handlers = renderMenu({ is_first: true });
    await userEvent.hover(row("Move group"));
    expect(row("Move to top")).toHaveAttribute("aria-disabled", "true");
    expect(row("Move up")).toHaveAttribute("title", "This group is already at the top");
    expect(row("Move down")).not.toHaveAttribute("aria-disabled");
    await clickRow("Move up");
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  test("the last group cannot move down or to the bottom", async () => {
    renderMenu({ is_last: true });
    await userEvent.hover(row("Move group"));
    expect(row("Move down")).toHaveAttribute("aria-disabled", "true");
    expect(row("Move to bottom")).toHaveAttribute("aria-disabled", "true");
    expect(row("Move up")).not.toHaveAttribute("aria-disabled");
  });
});

describe("Duplicate this group", () => {
  test.each([
    ["With items", true],
    ["Without items", false],
  ] as const)("%s reports with_items %s", async (label, with_items) => {
    const handlers = renderMenu();
    await userEvent.hover(row("Duplicate this group"));
    await clickRow(label);
    expect(handlers.onDuplicate).toHaveBeenCalledExactlyOnceWith(with_items);
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });
});

describe("Apps", () => {
  test.each([
    ["Integrations", "onOpenIntegrations"],
    ["Automations", "onOpenAutomations"],
  ] as const)("%s opens its center", async (label, handler) => {
    const handlers = renderMenu();
    await userEvent.hover(row("Apps"));
    await clickRow(label);
    expect(handlers[handler]).toHaveBeenCalledOnce();
  });
});
