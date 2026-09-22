import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupMenu from "@/components/board/table/menus/GroupMenu";
import { GROUP_PALETTE } from "@/components/board/table/constants";

type Props = React.ComponentProps<typeof GroupMenu>;

const buildHandlers = () => ({
  onExpandThis: vi.fn(),
  onExpandAllGroups: vi.fn(),
  onSelectAll: vi.fn(),
  onExpandSubitems: vi.fn(),
  onCollapseSubitems: vi.fn(),
  onAddGroup: vi.fn(),
  onDuplicate: vi.fn(),
  onMove: vi.fn(),
  onRename: vi.fn(),
  onChangeColor: vi.fn(),
  onTogglePriority: vi.fn(),
  onDelete: vi.fn(),
  onArchive: vi.fn(),
  onClose: vi.fn(),
});

const renderMenu = (overrides: Partial<Props> = {}) => {
  const handlers = buildHandlers();
  render(
    <GroupMenu
      panel_style={{ top: 0 }}
      is_collapsed={false}
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

const clickRow = (name: string | RegExp) => userEvent.click(screen.getByText(name));

describe("Group menu rows", () => {
  test("the collapse row and the priority row reflect the group's state", () => {
    renderMenu({ is_collapsed: true, is_priority: true });
    expect(screen.getByText("Expand this group")).toBeInTheDocument();
    expect(screen.getByText("Unmark as priority client")).toBeInTheDocument();
  });

  test.each([
    ["Collapse this group", "onExpandThis"],
    ["Expand all groups", "onExpandAllGroups"],
    ["Select all items in group", "onSelectAll"],
    ["Expand all subitems", "onExpandSubitems"],
    ["Collapse all subitems", "onCollapseSubitems"],
    ["Add group", "onAddGroup"],
    ["Mark as priority client", "onTogglePriority"],
    ["Rename group", "onRename"],
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
  const swatches = () => screen.queryAllByRole("button", { name: /^Set group color to / });

  test("hovering the row opens the palette", async () => {
    renderMenu();
    expect(swatches()).toHaveLength(0);
    await userEvent.hover(screen.getByText("Change group color"));
    expect(swatches()).toHaveLength(GROUP_PALETTE.length);
  });

  test("picking a swatch reports that color and closes the menu", async () => {
    const handlers = renderMenu();
    await userEvent.hover(screen.getByText("Change group color"));
    await userEvent.click(screen.getByRole("button", { name: "Set group color to #e04455" }));
    expect(handlers.onChangeColor).toHaveBeenCalledExactlyOnceWith("#e04455");
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  test("the current color is marked as pressed", async () => {
    renderMenu({ current_color: "#e04455" });
    await userEvent.hover(screen.getByText("Change group color"));
    expect(screen.getByRole("button", { name: "Set group color to #e04455" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Set group color to #4f6bed" })).toHaveAttribute("aria-pressed", "false");
  });

  test("hovering another row closes the palette", async () => {
    renderMenu();
    await userEvent.hover(screen.getByText("Change group color"));
    await userEvent.hover(screen.getByText("Rename group"));
    expect(swatches()).toHaveLength(0);
  });
});

describe("Move group", () => {
  test("offers the four moves and reports the one picked", async () => {
    const handlers = renderMenu();
    await userEvent.hover(screen.getByText("Move group"));
    await userEvent.click(screen.getByRole("button", { name: "Move to bottom" }));
    expect(handlers.onMove).toHaveBeenCalledExactlyOnceWith("bottom");
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });

  test("the first group cannot move up or to the top", async () => {
    const handlers = renderMenu({ is_first: true });
    await userEvent.hover(screen.getByText("Move group"));
    expect(screen.getByRole("button", { name: "Move to top" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move down" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Move up" }));
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  test("the last group cannot move down or to the bottom", async () => {
    renderMenu({ is_last: true });
    await userEvent.hover(screen.getByText("Move group"));
    expect(screen.getByRole("button", { name: "Move down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move to bottom" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move up" })).toBeEnabled();
  });
});

describe("Duplicate this group", () => {
  test.each([
    ["Group with items", true],
    ["Group without items", false],
  ] as const)("%s reports with_items %s", async (label, with_items) => {
    const handlers = renderMenu();
    await userEvent.hover(screen.getByText("Duplicate this group"));
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(handlers.onDuplicate).toHaveBeenCalledExactlyOnceWith(with_items);
    expect(handlers.onClose).toHaveBeenCalledOnce();
  });
});
