import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardTable, { type BoardTableProps } from "@/components/board/table/BoardTable";
import type { UseBoardTableConfig } from "@/components/board/table/useBoardTable";
import type { BoardTableGroup } from "@/components/board/table/types";
import { ThemeProvider } from "@/context/ThemeContext";
import { makeGroups } from "../../support/tableFixtures";

// The row "..." menu wired through the real table: rows, hover button, menu and the callbacks a real
// board (TableBoardView) passes in. The server calls themselves are replaced by mocks.

const renderTable = (props: Partial<BoardTableProps> = {}, config: Partial<UseBoardTableConfig> = {}, groups: BoardTableGroup[] = makeGroups()) => {
  // Same identity on every render: the table re-syncs its state whenever `initial_groups` changes.
  const table_config: UseBoardTableConfig = { initial_groups: groups, ...config };
  return render(
    <ThemeProvider>
      <BoardTable embedded config={table_config} {...props} />
    </ThemeProvider>
  );
};

const rowOf = (name: string): HTMLElement => {
  const row = screen.getByText(name).closest<HTMLElement>("div.relative.flex.items-stretch");
  if (!row) throw new Error(`No row found for "${name}"`);
  return row;
};

/** The "..." button that opens a row's menu. It only takes pointer events while its row is hovered. */
const menuTriggerOf = (name: string): HTMLElement => within(rowOf(name)).getByRole("button", { name: /^(Item|Subitem) options$/ });

const openMenuOf = async (name: string) => {
  fireEvent.mouseEnter(rowOf(name));
  await userEvent.click(menuTriggerOf(name));
};

const expandSubitemsOf = async (name: string) => {
  await userEvent.click(within(rowOf(name)).getByRole("button", { name: /^2$/ }));
};

/** A row of the open row menu. RowMenu is built on ActionMenu, so its rows are menu items, not plain buttons. */
const menuItem = (name: string | RegExp): HTMLElement => screen.getByRole("menuitem", { name });
const queryMenuItem = (name: string | RegExp): HTMLElement | null => screen.queryByRole("menuitem", { name });
const clickMenu = (name: string | RegExp) => userEvent.click(menuItem(name));

/** The side flyout a submenu row opened (named after that row), kept apart from the table's own group headers and rows. */
const flyout = (row_name: string): HTMLElement => screen.getByRole("menu", { name: row_name });
const clickFlyout = (row_name: string, name: string | RegExp) => userEvent.click(within(flyout(row_name)).getByRole("menuitem", { name }));

describe("opening the menu", () => {
  test("shows the item menu for a root row", async () => {
    renderTable();
    await openMenuOf("Row b");
    expect(screen.getByRole("menu", { name: "Item actions" })).toBeInTheDocument();
    expect(menuItem("Open item")).toBeInTheDocument();
    expect(menuItem("Add subitem")).toBeInTheDocument();
    expect(menuTriggerOf("Row b")).toHaveAttribute("aria-expanded", "true");
  });

  test("shows the subitem menu for a subitem row", async () => {
    renderTable();
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    expect(screen.getByRole("menu", { name: "Subitem actions" })).toBeInTheDocument();
    expect(menuItem("Open subitem")).toBeInTheDocument();
    expect(queryMenuItem("Add subitem")).not.toBeInTheDocument();
  });

  test("a read only board has no row menu button", () => {
    renderTable({}, { read_only: true });
    fireEvent.mouseEnter(rowOf("Row b"));
    expect(within(rowOf("Row b")).queryByRole("button", { name: "Item options" })).not.toBeInTheDocument();
    expect(queryMenuItem("Open item")).not.toBeInTheDocument();
  });
});

describe("Open item", () => {
  test("opens the row's drawer for an item and for a subitem", async () => {
    const onOpenItem = vi.fn();
    renderTable({}, { onOpenItem });
    await openMenuOf("Row b");
    await clickMenu("Open item");
    expect(onOpenItem).toHaveBeenLastCalledWith("b");

    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Open subitem");
    expect(onOpenItem).toHaveBeenLastCalledWith("a1");
  });
});

describe("Archive", () => {
  test("asks the board to archive the row instead of deleting it", async () => {
    const onArchiveNode = vi.fn().mockResolvedValue(undefined);
    const onDeleteNode = vi.fn();
    renderTable({ onArchiveNode }, { onDeleteNode });
    await openMenuOf("Row b");
    await clickMenu("Archive");
    expect(onArchiveNode).toHaveBeenCalledWith("b");
    expect(onDeleteNode).not.toHaveBeenCalled();
  });

  test("a subitem is archived the same way", async () => {
    const onArchiveNode = vi.fn().mockResolvedValue(undefined);
    renderTable({ onArchiveNode });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Archive");
    expect(onArchiveNode).toHaveBeenCalledWith("a1");
  });

  test("without a board behind it the row just leaves the table", async () => {
    renderTable();
    await openMenuOf("Row b");
    await clickMenu("Archive");
    expect(screen.queryByText("Row b")).not.toBeInTheDocument();
  });
});

describe("Delete", () => {
  test("reports the delete to the board", async () => {
    const onDeleteNode = vi.fn();
    renderTable({}, { onDeleteNode });
    await openMenuOf("Row b");
    await clickMenu("Delete");
    expect(onDeleteNode).toHaveBeenCalledWith("b");
  });
});

describe("Create new item below", () => {
  test("waits for the board to create the row and then opens it for naming under its real id", async () => {
    const onCreateBelow = vi.fn().mockResolvedValue("9001");
    renderTable({ onCreateBelow });
    await openMenuOf("Row a");
    await clickMenu("Create new item below");
    expect(onCreateBelow).toHaveBeenCalledWith("a");
    const input = await screen.findByDisplayValue("New item");
    expect(input).toBeInTheDocument();
  });

  test("adds nothing when the board could not create the row", async () => {
    const onCreateBelow = vi.fn().mockResolvedValue(null);
    renderTable({ onCreateBelow });
    await openMenuOf("Row a");
    await clickMenu("Create new item below");
    await waitFor(() => expect(onCreateBelow).toHaveBeenCalled());
    expect(screen.queryByDisplayValue("New item")).not.toBeInTheDocument();
  });

  test("without a board behind it the row is created locally", async () => {
    renderTable();
    await openMenuOf("Row a");
    await clickMenu("Create new item below");
    expect(await screen.findByDisplayValue("New item")).toBeInTheDocument();
  });
});

describe("Move to group", () => {
  test("asks the board to move the item to the chosen group", async () => {
    const onMoveItemToGroup = vi.fn().mockResolvedValue(undefined);
    renderTable({ onMoveItemToGroup });
    await openMenuOf("Row b");
    await clickMenu("Move to");
    expect(within(flyout("Move to")).getByText("Move to group")).toBeInTheDocument();
    await clickFlyout("Move to", "Group g2");
    expect(onMoveItemToGroup).toHaveBeenCalledWith("b", "g2");
  });

  test("does not offer the group the item is already in", async () => {
    const onMoveItemToGroup = vi.fn();
    renderTable({ onMoveItemToGroup });
    await openMenuOf("Row b");
    await clickMenu("Move to");
    const current = within(flyout("Move to")).getByRole("menuitem", { name: /^Group g1/ });
    expect(current).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(current);
    expect(onMoveItemToGroup).not.toHaveBeenCalled();
  });

  test("without a board behind it the item moves locally", async () => {
    renderTable();
    await openMenuOf("Row b");
    await clickMenu("Move to");
    await clickFlyout("Move to", "Group g2");
    expect(within(screen.getByText("Group g2").closest("div")!.parentElement!.parentElement!).queryByText("Row b")).not.toBeNull();
  });
});

describe("Convert to subitem", () => {
  test("asks the board to nest the item under the chosen one", async () => {
    const onChangeNodeParent = vi.fn().mockResolvedValue(undefined);
    renderTable({ onChangeNodeParent });
    await openMenuOf("Row b");
    await clickMenu("Convert to subitem");
    await clickFlyout("Convert to subitem", "Row c");
    expect(onChangeNodeParent).toHaveBeenCalledWith("b", "c");
  });

  test("the item being converted is not offered as its own parent", async () => {
    renderTable({ onChangeNodeParent: vi.fn() });
    await openMenuOf("Row b");
    await clickMenu("Convert to subitem");
    const targets = flyout("Convert to subitem");
    expect(within(targets).getByText("Make it a subitem of")).toBeInTheDocument();
    expect(within(targets).queryByRole("menuitem", { name: "Row b" })).not.toBeInTheDocument();
    expect(within(targets).getByRole("menuitem", { name: "Row a" })).toBeInTheDocument();
  });

  test("an item that has subitems can not be converted", async () => {
    const onChangeNodeParent = vi.fn();
    renderTable({ onChangeNodeParent });
    await openMenuOf("Row a");
    const row = menuItem("Convert to subitem");
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(row).toHaveAttribute("title", "Move or delete its subitems first");
    await userEvent.click(row);
    expect(onChangeNodeParent).not.toHaveBeenCalled();
  });

  test("the only item on the board can not be converted", async () => {
    const [first] = makeGroups();
    renderTable({}, {}, [{ ...first, items: [first.items[1]] }]);
    await openMenuOf("Row b");
    const row = menuItem("Convert to subitem");
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(row).toHaveAttribute("title", "There is no other item to convert this into");
  });
});

describe("Convert to item and Move to item", () => {
  test("Convert to item asks the board to make the subitem a root row", async () => {
    const onChangeNodeParent = vi.fn().mockResolvedValue(undefined);
    renderTable({ onChangeNodeParent });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Convert to item");
    expect(onChangeNodeParent).toHaveBeenCalledWith("a1", null);
  });

  test("Move to item asks the board to re-parent the subitem", async () => {
    const onChangeNodeParent = vi.fn().mockResolvedValue(undefined);
    renderTable({ onChangeNodeParent });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Move to");
    expect(within(flyout("Move to")).getByText("Move to item")).toBeInTheDocument();
    await clickFlyout("Move to", "Row c");
    expect(onChangeNodeParent).toHaveBeenCalledWith("a1", "c");
  });

  test("the subitem's current parent is marked and can not be picked", async () => {
    renderTable({ onChangeNodeParent: vi.fn() });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Move to");
    const current = within(flyout("Move to")).getByRole("menuitem", { name: /^Row a\s*Current$/ });
    expect(current).toHaveAttribute("aria-disabled", "true");
  });

  test("without a board behind them the conversions happen locally", async () => {
    renderTable();
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Convert to item");
    expect(within(rowOf("Row a1")).queryByRole("button", { name: /^\d+$/ })).toBeNull();
    expect(screen.getByText("Row a1")).toBeInTheDocument();
  });
});

describe("Duplicate", () => {
  test("asks the board to duplicate the item with its subitems", async () => {
    const onDuplicateNode = vi.fn().mockResolvedValue(undefined);
    renderTable({ onDuplicateNode });
    await openMenuOf("Row a");
    await clickMenu("Duplicate");
    await clickFlyout("Duplicate", "With subitems");
    expect(onDuplicateNode).toHaveBeenCalledWith("a", true);
  });

  test("asks the board to duplicate a subitem", async () => {
    const onDuplicateNode = vi.fn().mockResolvedValue(undefined);
    renderTable({ onDuplicateNode });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    await clickMenu("Duplicate");
    expect(onDuplicateNode).toHaveBeenCalledWith("a1", false);
  });
});

describe("Mark as priority and recurring", () => {
  test("marking as priority reports the new flag", async () => {
    const onToggleNodePriority = vi.fn();
    renderTable({}, { onToggleNodePriority });
    await openMenuOf("Row b");
    await clickMenu("Mark as priority");
    expect(onToggleNodePriority).toHaveBeenCalledWith("b", true);
  });

  test("a priority row offers to unmark it", async () => {
    const [first, second] = makeGroups();
    const groups = [{ ...first, items: [{ ...first.items[1], is_priority: true }] }, second];
    const onToggleNodePriority = vi.fn();
    renderTable({}, { onToggleNodePriority }, groups);
    await openMenuOf("Row b");
    await clickMenu("Unmark as priority");
    expect(onToggleNodePriority).toHaveBeenCalledWith("b", false);
  });

  test("setting a recurrence reports it to the board", async () => {
    const onSetItemRecurrence = vi.fn();
    renderTable({}, { onSetItemRecurrence });
    await openMenuOf("Row b");
    await clickMenu("Set recurring");
    await userEvent.click(within(screen.getByRole("group", { name: "Set recurring" })).getByRole("button", { name: "Start recurring" }));
    expect(onSetItemRecurrence).toHaveBeenCalledWith("b", { frequency: "weekly", interval_count: 1 });
  });

  test("a subitem has no recurring option", async () => {
    renderTable({}, { onSetItemRecurrence: vi.fn() });
    await expandSubitemsOf("Row a");
    await openMenuOf("Row a1");
    expect(queryMenuItem(/recurring/i)).not.toBeInTheDocument();
  });
});

describe("closing the menu", () => {
  test("choosing an action closes the menu", async () => {
    renderTable({ onArchiveNode: vi.fn().mockResolvedValue(undefined) });
    await openMenuOf("Row b");
    await clickMenu("Archive");
    expect(screen.queryByRole("menu", { name: "Item actions" })).not.toBeInTheDocument();
    expect(menuTriggerOf("Row c")).toHaveAttribute("aria-expanded", "false");
  });
});
