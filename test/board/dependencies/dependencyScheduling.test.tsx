import { afterEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { buildItemDependencySections } from "@/components/board/dependencies/buildItemDependencySections";
import { describeLag } from "@/components/board/table/menus/DependencyLinkRow";
import { dependencyCandidatesAmong } from "@/components/board/table/treeUtils";
import { useBoardTable } from "@/components/board/table/useBoardTable";
import type { BoardColumnDto } from "@/types/board-content";
import { boardContentService } from "@/services/board-content.service";
import { makeItemDto, makeSubDto } from "../../support/boardItemFixtures";
import { makeGroup, makeItem, makeNode } from "../../support/tableFixtures";

// The Dependency column's scheduling on the frontend: the drawer's Dependencies tab data, which
// rows a link may point to, undo of a link edit, and the request the links are saved with.

const makeColumn = (id: number, type: BoardColumnDto["type"], overrides: Partial<BoardColumnDto> = {}): BoardColumnDto => ({
  id,
  board_id: 1,
  board_view_id: 1,
  key: `col_${id}`,
  label: type === "dependency" ? "Depends on" : "Date",
  type,
  scope: "item",
  position: id,
  width: 160,
  config: null,
  hideable: true,
  pinnable: true,
  view_restriction: null,
  edit_restriction: null,
  can_edit_values: true,
  ...overrides,
});

describe("describeLag", () => {
  test("reads the offset the way the popover says it", () => {
    expect(describeLag(0)).toBe("Same day");
    expect(describeLag(7)).toBe("7 days after");
    expect(describeLag(-1)).toBe("1 day before");
  });
});

describe("dependencyCandidatesAmong", () => {
  test("leaves out the row itself and every row that already depends on it", () => {
    const nodes = [
      { id: "record", name: "Record", values: {} },
      { id: "edit", name: "Edit", values: { dep: ["record"] } },
      { id: "publish", name: "Publish", values: { dep: ["edit"] } },
      { id: "guest", name: "Schedule guest", values: {} },
    ];
    expect(dependencyCandidatesAmong(nodes, "record", "dep").map((node) => node.id)).toEqual(["guest"]);
  });
});

describe("buildItemDependencySections", () => {
  const date = makeColumn(1, "date");
  const dependency = makeColumn(2, "dependency", { config: { date_column_id: 1, dependency_mode: "strict" } });

  test("lists what the item depends on with its lag, and what depends on it", () => {
    const record = makeItemDto(100, { name: "Record Episode", values: { "1": "2026-09-30" } });
    const notes = makeItemDto(200, { name: "Write show notes", values: { "1": "2026-10-07", "2": ["100"] }, dependency_links: { "2": { "100": { type: "fs", lag_days: 7 } } } });
    const article = makeItemDto(300, { name: "Write article", values: { "2": ["100"] }, dependency_links: { "2": { "100": { type: "fs", lag_days: 7 } } } });
    const items = [record, notes, article];

    const [notes_section] = buildItemDependencySections(notes, items, [date, dependency], () => true);
    expect(notes_section.mode).toBe("strict");
    expect(notes_section.date_column).toEqual({ title: "Date", kind: "date" });
    expect(notes_section.links).toEqual([{ id: "100", name: "Record Episode", type: "fs", lag_days: 7, date_label: expect.stringContaining("Sep 30") }]);
    expect(notes_section.own_date_label).toContain("Oct 7");

    const [record_section] = buildItemDependencySections(record, items, [date, dependency], () => true);
    expect(record_section.dependents.map((dependent) => [dependent.name, dependent.lag_days])).toEqual([["Write show notes", 7], ["Write article", 7]]);
    // Both already depend on Record Episode, so linking either back would make a loop.
    expect(record_section.candidates).toEqual([]);
  });

  test("only uses Dependency columns of the item's own level, and flags columns the viewer may not edit", () => {
    const sub_dependency = makeColumn(3, "dependency", { scope: "subitem" });
    const parent = makeItemDto(1, { children: [makeSubDto(11, 1), makeSubDto(12, 1)] });
    const sections = buildItemDependencySections(parent.children[0], [parent], [date, dependency, sub_dependency], (column_id) => column_id !== "3");
    expect(sections.map((section) => section.column_id)).toEqual(["3"]);
    expect(sections[0].is_read_only).toBe(true);
    expect(sections[0].date_column).toBeNull();
    expect(sections[0].candidates.map((candidate) => candidate.id)).toEqual(["12"]);
  });
});

describe("useBoardTable setDependencyLinks", () => {
  test("saves the links through the caller and undo puts the previous lag back", () => {
    const onSetDependencyLinks = vi.fn();
    const initial_groups = [
      makeGroup("g1", [
        makeItem("record"),
        makeItem("notes", [], { values: { dep: ["record"] }, dependency_links: { dep: { record: { type: "fs", lag_days: 3 } } } }),
      ]),
    ];
    const { result } = renderHook(() => useBoardTable({ initial_groups, onSetDependencyLinks }));

    act(() => result.current.actions.setDependencyLinks("notes", "dep", [{ predecessor_id: "record", lag_days: 7 }]));
    expect(onSetDependencyLinks).toHaveBeenLastCalledWith("notes", "dep", [{ predecessor_id: "record", lag_days: 7 }]);
    const notes = () => result.current.state.groups[0].items[1];
    expect(notes().dependency_links?.dep.record).toEqual({ type: "fs", lag_days: 7 });

    act(() => result.current.actions.undo());
    expect(onSetDependencyLinks).toHaveBeenLastCalledWith("notes", "dep", [{ predecessor_id: "record", type: "fs", lag_days: 3 }]);
    expect(notes().dependency_links?.dep.record.lag_days).toBe(3);

    act(() => result.current.actions.redo());
    expect(notes().dependency_links?.dep.record.lag_days).toBe(7);
  });

  test("without a caller handler only the predecessor ids are kept, through the ordinary cell write", () => {
    const onCellValueChange = vi.fn();
    const initial_groups = [makeGroup("g1", [makeItem("a"), makeItem("b", [makeNode("b1")])])];
    const { result } = renderHook(() => useBoardTable({ initial_groups, onCellValueChange }));
    act(() => result.current.actions.setDependencyLinks("b", "dep", [{ predecessor_id: "a" }]));
    expect(onCellValueChange).toHaveBeenCalledWith("b", "dep", ["a"]);
  });
});

describe("dependency requests", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("saving links PUTs them and returns the items whose dates moved", async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: String(init?.method), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return new Response(JSON.stringify({ item: { id: 200, values: {} }, moved_items: [{ id: 300, values: {} }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const result = await boardContentService.updateItemDependencies(5, 200, 9, [{ predecessor_id: 100, lag_days: 7 }]);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toContain("/api/boards/5/items/200/dependencies/9");
    expect(calls[0].body).toEqual({ links: [{ predecessor_id: 100, lag_days: 7 }] });
    expect(result.moved_items.map((item) => item.id)).toEqual([300]);
  });
});
