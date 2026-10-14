import { beforeAll, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import DependencyPicker from "@/components/board/table/menus/DependencyPicker";
import { dependencyPickerSections } from "@/components/board/table/treeUtils";
import { useBoardTable } from "@/components/board/table/useBoardTable";
import { makeGroup, makeItem, makeNode } from "../../support/tableFixtures";

// The Dependency cell's "Choose dependencies" picker: which items it lists and under which
// group, selecting and creating items, and the table action that creates and links one.

describe("dependencyPickerSections", () => {
  test("lists the other items by group, leaving out the row itself and the items that depend on it", () => {
    const groups = [
      makeGroup("g1", [makeItem("a"), makeItem("b", [], { values: { dep: ["a"] } })]),
      makeGroup("g2", [makeItem("c"), makeItem("d")]),
    ];
    const sections = dependencyPickerSections(groups, "a", "dep", []);
    // "b" already depends on "a", linking back would close a loop.
    expect(sections.map((section) => ({ key: section.key, ids: section.items.map((item) => item.id) }))).toEqual([{ key: "g2", ids: ["c", "d"] }]);
  });

  test("keeps the items already linked and lists subitems under their parent item", () => {
    const groups = [makeGroup("g1", [makeItem("a", [makeNode("a1"), makeNode("a2")]), makeItem("b", [makeNode("b1")])])];
    const sections = dependencyPickerSections(groups, "a1", "dep", ["b1"]);
    expect(sections.map((section) => ({ title: section.title, ids: section.items.map((item) => item.id) }))).toEqual([
      { title: "Row a", ids: ["a2"] },
      { title: "Row b", ids: ["b1"] },
    ]);
  });
});

const renderPicker = (overrides: Partial<Parameters<typeof DependencyPicker>[0]> = {}) => {
  const props = {
    sections: [
      { key: "g1", title: "Group Title", color: "#579bfc", items: [{ id: "2", name: "Item 2" }, { id: "3", name: "Item 3" }] },
      { key: "g2", title: "Other group", color: "#a25ddc", items: [{ id: "4", name: "Item 4" }] },
    ],
    links: [{ id: "3", name: "Item 3", type: "fs" as const, lag_days: 0, date_label: null }],
    is_timeline: false,
    schedule_notice: null,
    can_edit: true,
    can_create: true,
    can_give_feedback: true,
    can_open_items: true,
    onChange: vi.fn(),
    onCreateItem: vi.fn().mockResolvedValue(undefined),
    onOpenItem: vi.fn(),
    onGiveFeedback: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(
    <div style={{ position: "relative" }}>
      <DependencyPicker {...props} />
    </div>
  );
  return props;
};

describe("DependencyPicker", () => {
  // jsdom has no hit testing, `PopoverPanel` asks it whether the anchor cell is covered.
  beforeAll(() => {
    if (!document.elementsFromPoint) document.elementsFromPoint = () => [];
  });

  test("shows the items by group, the selected one marked, and toggles a link on click", () => {
    const props = renderPicker();
    expect(screen.getByText("Choose dependencies")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Group Title")).toBeTruthy();
    expect(screen.getByRole("option", { name: /Item 3/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("option", { name: /Item 2/ }));
    expect(props.onChange).toHaveBeenLastCalledWith([{ predecessor_id: "3" }, { predecessor_id: "2" }]);

    fireEvent.click(screen.getByRole("option", { name: /Item 3/ }));
    expect(props.onChange).toHaveBeenLastCalledWith([]);
  });

  test("opens an item without selecting it", () => {
    const props = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Open Item 4" }));
    expect(props.onOpenItem).toHaveBeenCalledWith("4");
    expect(props.onChange).not.toHaveBeenCalled();
  });

  test("offers to create the typed name when no item has it", async () => {
    const props = renderPicker();
    fireEvent.change(screen.getByPlaceholderText("Type to find or create item"), { target: { value: "Write show notes" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/ }));
    await waitFor(() => expect(props.onCreateItem).toHaveBeenCalledWith("Write show notes"));
  });

  test("a read only viewer can search but not link or create", () => {
    const props = renderPicker({ can_edit: false });
    fireEvent.change(screen.getByPlaceholderText("Type to find item"), { target: { value: "Nothing like it" } });
    expect(screen.queryByRole("button", { name: /Create/ })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Type to find item"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("option", { name: /Item 2/ }));
    expect(props.onChange).not.toHaveBeenCalled();
  });
});

describe("useBoardTable createDependencyItem", () => {
  test("creates the item in the row's group and links the cell to it", async () => {
    const onCreateNamedItem = vi.fn().mockResolvedValue("99");
    const onSetDependencyLinks = vi.fn();
    const initial_groups = [makeGroup("g1", [makeItem("a"), makeItem("b", [], { values: { dep: ["a"] } })])];
    const { result } = renderHook(() => useBoardTable({ initial_groups, onCreateNamedItem, onSetDependencyLinks }));

    await act(async () => {
      await result.current.actions.createDependencyItem("b", "dep", "Publish");
    });

    expect(onCreateNamedItem).toHaveBeenCalledWith("g1", null, "Publish");
    expect(result.current.state.groups[0].items.map((item) => item.id)).toEqual(["a", "b", "99"]);
    expect(onSetDependencyLinks).toHaveBeenLastCalledWith("b", "dep", [{ predecessor_id: "a" }, { predecessor_id: "99" }]);
  });
});
