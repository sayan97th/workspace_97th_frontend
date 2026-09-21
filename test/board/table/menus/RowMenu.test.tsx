import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RowMenu, { type RowMenuTarget } from "@/components/board/table/menus/RowMenu";

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

const buildProps = (overrides: Partial<Props> = {}) => {
  const handlers = {
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
  };
  const props: Props = {
    is_sub: false,
    anchor_el: anchor,
    move_targets: MOVE_TARGETS,
    convert_targets: CONVERT_TARGETS,
    copied: false,
    is_priority: false,
    recurrence: null,
    ...handlers,
    ...overrides,
  };
  return { props, handlers };
};

const renderMenu = (overrides: Partial<Props> = {}) => {
  const { props, handlers } = buildProps(overrides);
  render(<RowMenu {...props} />);
  return handlers;
};

const clickRow = (name: string | RegExp) => userEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  anchor = document.createElement("button");
  document.body.appendChild(anchor);
});

afterEach(() => {
  anchor.remove();
});

describe("RowMenu labels", () => {
  test("a root item gets the item wording and every root-only row", () => {
    renderMenu();
    for (const name of ["Open item", "Copy item link", "Mark as priority", "Move to group", "Duplicate", "Create new item below", "Set recurring...", "Add subitem", "Convert to subitem", "Archive", "Delete"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  test("a subitem gets the subitem wording and no root-only row", () => {
    renderMenu({ is_sub: true, convert_targets: [], onSetRecurrence: undefined });
    for (const name of ["Open subitem", "Copy subitem link", "Move to item", "Create new subitem below", "Convert to item", "Archive", "Delete"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Add subitem" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recurring/i })).not.toBeInTheDocument();
  });

  test("the priority row reflects the current flag", () => {
    renderMenu({ is_priority: true });
    expect(screen.getByRole("button", { name: "Unmark as priority" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as priority" })).not.toBeInTheDocument();
  });

  test("the move row is hidden when there is nowhere to move to", () => {
    renderMenu({ move_targets: [] });
    expect(screen.queryByRole("button", { name: "Move to group" })).not.toBeInTheDocument();
  });

  test("the recurring row is hidden when the caller does not support it", () => {
    renderMenu({ onSetRecurrence: undefined });
    expect(screen.queryByRole("button", { name: /recurring/i })).not.toBeInTheDocument();
  });

  test("shows the copied note only when the link was copied", () => {
    renderMenu({ copied: true });
    expect(screen.getByText("copied")).toBeInTheDocument();
  });
});

describe("RowMenu simple actions", () => {
  test("Open item opens the row and closes the menu", async () => {
    const handlers = renderMenu();
    await clickRow("Open item");
    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
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
});

describe("RowMenu move", () => {
  test("Move to group lists every group with the current one checked and disabled", async () => {
    renderMenu();
    await clickRow("Move to group");
    expect(screen.getByRole("button", { name: /Group one/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Group two" })).toBeEnabled();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  test("picking a group moves the item there and closes the menu", async () => {
    const handlers = renderMenu();
    await clickRow("Move to group");
    await clickRow("Group two");
    expect(handlers.onMoveTo).toHaveBeenCalledWith("g2");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("the current group cannot be picked", async () => {
    const handlers = renderMenu();
    await clickRow("Move to group");
    await userEvent.click(screen.getByRole("button", { name: /Group one/ }));
    expect(handlers.onMoveTo).not.toHaveBeenCalled();
  });

  test("a subitem moves to another item", async () => {
    const handlers = renderMenu({ is_sub: true, move_targets: [{ id: "i1", label: "First item", current: true }, { id: "i2", label: "Second item" }], convert_targets: [] });
    await clickRow("Move to item");
    await clickRow("Second item");
    expect(handlers.onMoveTo).toHaveBeenCalledWith("i2");
  });

  test("clicking the row twice closes its submenu again", async () => {
    renderMenu();
    await clickRow("Move to group");
    expect(screen.getByRole("button", { name: "Group two" })).toBeInTheDocument();
    await clickRow("Move to group");
    expect(screen.queryByRole("button", { name: "Group two" })).not.toBeInTheDocument();
  });
});

describe("RowMenu convert", () => {
  test("Convert to subitem lists the other items and converts to the chosen one", async () => {
    const handlers = renderMenu();
    await clickRow("Convert to subitem");
    expect(screen.getByText("Make it a subitem of")).toBeInTheDocument();
    await clickRow("Second item");
    expect(handlers.onConvertToSubOf).toHaveBeenCalledWith("i2");
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("an item that has subitems cannot be converted and says why", async () => {
    const handlers = renderMenu({ convert_blocked_reason: "Move or delete its subitems first" });
    const row = screen.getByRole("button", { name: "Convert to subitem" });
    expect(row).toBeDisabled();
    expect(row).toHaveAttribute("title", "Move or delete its subitems first");
    await userEvent.click(row);
    expect(screen.queryByText("Make it a subitem of")).not.toBeInTheDocument();
    expect(handlers.onConvertToSubOf).not.toHaveBeenCalled();
  });

  test("an item with no other item to hang under cannot be converted", () => {
    renderMenu({ convert_targets: [] });
    const row = screen.getByRole("button", { name: "Convert to subitem" });
    expect(row).toBeDisabled();
    expect(row).toHaveAttribute("title", "There is no other item to convert this into");
  });

  test("a subitem converts straight to an item and closes the menu", async () => {
    const handlers = renderMenu({ is_sub: true, convert_targets: [] });
    const row = screen.getByRole("button", { name: "Convert to item" });
    expect(row).toBeEnabled();
    await userEvent.click(row);
    expect(handlers.onConvertToItem).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RowMenu duplicate", () => {
  test("an item can be duplicated with or without its subitems", async () => {
    const handlers = renderMenu();
    await clickRow("Duplicate");
    await clickRow("This item without subitems");
    expect(handlers.onDuplicate).toHaveBeenLastCalledWith(false);
    await clickRow("Duplicate");
    await clickRow("This item with subitems");
    expect(handlers.onDuplicate).toHaveBeenLastCalledWith(true);
  });

  test("a subitem only offers a plain duplicate", async () => {
    const handlers = renderMenu({ is_sub: true, convert_targets: [] });
    await clickRow("Duplicate");
    expect(screen.queryByRole("button", { name: "This item with subitems" })).not.toBeInTheDocument();
    await clickRow("This subitem");
    expect(handlers.onDuplicate).toHaveBeenCalledWith(false);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("RowMenu recurring", () => {
  test("starts a weekly recurrence every 1 week by default", async () => {
    const handlers = renderMenu();
    await clickRow("Set recurring...");
    await clickRow("Start recurring");
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("weekly", 1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test("sends the interval and frequency the user picked", async () => {
    const handlers = renderMenu();
    await clickRow("Set recurring...");
    const interval = screen.getByRole("spinbutton");
    await userEvent.clear(interval);
    await userEvent.type(interval, "3");
    await userEvent.selectOptions(screen.getByRole("combobox"), "monthly");
    await clickRow("Start recurring");
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("monthly", 3);
  });

  test.each([["0", 1], ["", 1], ["-4", 1]])("an interval of %j is raised to %i", async (typed, expected) => {
    const handlers = renderMenu();
    await clickRow("Set recurring...");
    const interval = screen.getByRole("spinbutton");
    await userEvent.clear(interval);
    if (typed) await userEvent.type(interval, typed);
    await clickRow("Start recurring");
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("weekly", expected);
  });

  test("an already recurring item shows its schedule, can be updated and can be stopped", async () => {
    const handlers = renderMenu({ recurrence: { frequency: "daily", interval_count: 5 } });
    await clickRow("Recurring");
    expect(screen.getByRole("spinbutton")).toHaveValue(5);
    expect(screen.getByRole("combobox")).toHaveValue("daily");
    await clickRow("Update");
    expect(handlers.onSetRecurrence).toHaveBeenCalledWith("daily", 5);

    await clickRow("Recurring");
    await clickRow("Stop recurring");
    expect(handlers.onClearRecurrence).toHaveBeenCalledTimes(1);
  });

  test("an item that is not recurring has no Stop recurring button", async () => {
    renderMenu();
    await clickRow("Set recurring...");
    expect(screen.queryByRole("button", { name: "Stop recurring" })).not.toBeInTheDocument();
  });

  test("offers the three frequencies", async () => {
    renderMenu();
    await clickRow("Set recurring...");
    const options = within(screen.getByRole("combobox")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["day(s)", "week(s)", "month(s)"]);
  });
});
