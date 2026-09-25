import { describe, expect, test } from "vitest";
import { formatLoad, loadLevel, reassignPeople } from "@/components/board/workload/workloadUtils";

describe("load level", () => {
  test.each([
    [0, 8, "empty"],
    [4, 8, "under"],
    [7, 8, "full"],
    [8, 8, "full"],
    [9, 8, "over"],
    [2, null, "under"],
  ] as const)("%s of %s is %s", (load, capacity, level) => {
    expect(loadLevel(load, capacity)).toBe(level);
  });
});

describe("reassigning an item", () => {
  test("swaps the old person for the new one and keeps everyone else", () => {
    expect(reassignPeople([1, 2], 1, 3)).toEqual(["2", "3"]);
  });

  test("does not add the same person twice", () => {
    expect(reassignPeople([1, 2], 1, 2)).toEqual(["2"]);
  });

  test("assigns an unassigned item", () => {
    expect(reassignPeople([], null, 5)).toEqual(["5"]);
  });

  test("dropping on Unassigned removes the person", () => {
    expect(reassignPeople([1, 2], 1, null)).toEqual(["2"]);
  });
});

test("formats loads without trailing zeros", () => {
  expect([formatLoad(3), formatLoad(2.5), formatLoad(2.04)]).toEqual(["3", "2.5", "2"]);
});
