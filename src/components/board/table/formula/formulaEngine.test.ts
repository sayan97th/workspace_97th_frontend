import { describe, expect, test } from "vitest";
import { evaluateExample, inferFormulaType, runFormula, toDisplayExpression, toStoredExpression, validateFormula } from "./formulaEngine";
import { FORMULA_FUNCTIONS } from "./formulaFunctions";
import type { FormulaSourceColumn } from "../types";

// Pure engine tests, no browser: run with `npm test`.

const sources: FormulaSourceColumn[] = [
  { id: "1", title: "Budget", kind: "number" },
  { id: "2", title: "Spent", kind: "number" },
  { id: "3", title: "Status", kind: "status", options: [{ id: "done", label: "Done", color: "#00c875" }] },
  { id: "4", title: "Due", kind: "date" },
  { id: "5", title: "Notes", kind: "text" },
  { id: "6", title: "Done?", kind: "checkbox" },
  { id: "7", title: "Start", kind: "date" },
  { id: "__name", title: "Item", kind: "text" },
];
const context = { sources, values: { 1: "1000", 2: "250.5", 3: "done", 4: "2026-09-25", 5: "", 6: true }, item_name: "Launch" };
const run = (expression: string, ctx = context) => {
  const outcome = runFormula(expression, ctx);
  return outcome.ok ? outcome.text : outcome.code;
};

const CASES: [string, string][] = [
  ["1 + 2 * 3", "7"],
  ["(1 + 2) * 3", "9"],
  ["-2 ^ 2", "-4"],
  ["2 ^ 3 ^ 2", "512"],
  ["0.1 + 0.2", "0.3"],
  ["{Budget} - {Spent}", "749.5"],
  ["{Budget} / 0", "#DIV/0!"],
  ["IFERROR({Budget} / 0, 0)", "0"],
  ['IF({Status} = "Done", "Yes", "No")', "Yes"],
  ["IF(1 > 2, 1)", "FALSE"],
  ["IF(TRUE, 1, 1 / 0)", "1"],
  ['{Item} & " - " & {Status}', "Launch - Done"],
  ['{Notes} = ""', "TRUE"],
  ["ISBLANK({Notes})", "TRUE"],
  ["ROUND(1.005, 2)", "1.01"],
  ["ROUND(-2.5)", "-3"],
  ["ROUND(1234, -2)", "1200"],
  ["ROUNDUP(3.141, 2)", "3.15"],
  ["ROUNDDOWN(-3.999, 2)", "-3.99"],
  ["MOD(-3, 2)", "1"],
  ["SUM({Budget}, {Spent}, 1)", "1251.5"],
  ["AVERAGE({Budget}, {Spent})", "625.25"],
  ['"5" + 2', "7"],
  ['"abc" + 2', "#VALUE!"],
  ["{Nope} + 1", "#REF!"],
  ["MAX()", "#VALUE!"],
  ["{Due} - DATE(2026, 9, 19)", "6"],
  ["{Due} - {Start}", ""],
  ["{Due} + 1", "2026-09-26"],
  ["ADD_DAYS({Due}, 5)", "2026-09-30"],
  ["DAYS(DATE(2026, 10, 1), DATE(2026, 9, 1))", "30"],
  ['FORMAT_DATE({Due}, "dddd, MMM D YYYY")', "Friday, Sep 25 2026"],
  ["WEEKDAY({Due})", "5"],
  ["WORKDAYS(DATE(2026, 9, 14), DATE(2026, 9, 25))", "10"],
  ['LEFT("Workspace", 4)', "Work"],
  ['MID("Workspace", 5, 3)', "spa"],
  ['SUBSTITUTE("a-b-c", "-", "/", 2)', "a-b/c"],
  ['FIND("space", "Workspace")', "5"],
  ['REPT("ab", 3)', "ababab"],
  ["AND(TRUE, 1 < 2)", "TRUE"],
  ["NOT(TRUE())", "FALSE"],
  ['SWITCH("b", "a", 1, "b", 2, 0)', "2"],
  ['SWITCH("z", "a", 1, 0)', "0"],
  ["IFS(FALSE, 1)", "#N/A"],
  ["1 = 1.0", "TRUE"],
  ['"a" < "B"', "TRUE"],
  ["{Done?} = TRUE", "TRUE"],
  ["1 +", "#ERROR!"],
  ['"abc', "#ERROR!"],
  ["(1 + 2", "#ERROR!"],
  ["1e3", "#ERROR!"],
  ["FOO(1)", "#NAME?"],
  ["IF(1)", "#VALUE!"],
];

describe("formula evaluation", () => {
  for (const [expression, expected] of CASES) {
    test(`${expression} = ${expected || "(blank)"}`, () => {
      expect(run(expression)).toBe(expected);
    });
  }

  test("every documented function example evaluates without an error", () => {
    for (const fn of FORMULA_FUNCTIONS) {
      expect(evaluateExample(fn.example), `${fn.name}: ${fn.example}`).not.toMatch(/^#/);
      expect(fn.min_args).toBeLessThanOrEqual(fn.max_args);
    }
  });
});

describe("formula validation", () => {
  test("accepts a valid formula", () => {
    expect(validateFormula("{Budget} + {Spent}", sources)).toEqual([]);
  });

  test("reports unknown columns, functions and argument counts", () => {
    expect(validateFormula("{Budgett} + 1", sources)[0].message).toBe('There is no column named "Budgett".');
    expect(validateFormula("FOO(1)", sources)[0].message).toBe("FOO is not a known function.");
    expect(validateFormula("ROUND()", sources)[0].message).toContain("ROUND takes 1 to 2 arguments");
    expect(validateFormula("Budget + 1", sources)[0].message).toContain("Wrap column names in braces");
  });

  test("flags a column title shared by two columns as ambiguous", () => {
    const duplicated = [...sources, { id: "9", title: "budget", kind: "number" as const }];
    expect(validateFormula("{Budget}", duplicated)[0].message).toContain("More than one column");
    expect(validateFormula("{#1}", duplicated)).toEqual([]);
  });
});

describe("formula types", () => {
  const infer = (expression: string) => inferFormulaType(expression, sources);

  test("infers the result type from the expression alone", () => {
    expect(infer("{Budget} - {Spent}")).toBe("number");
    expect(infer("{Item} & 1")).toBe("text");
    expect(infer("{Due} - {Start}")).toBe("number");
    expect(infer("{Due} + 1")).toBe("date");
    expect(infer("IF(1 > 0, 1, 2)")).toBe("number");
    expect(infer('IF(1 > 0, 1, "a")')).toBe("unknown");
    expect(infer("IFERROR(1 / 0, 0)")).toBe("number");
  });
});

describe("column references", () => {
  test("converts titles to stable ids and back", () => {
    const { stored, unresolved } = toStoredExpression('{budget} - {Spent} & "{Not a ref}" & {Missing}', sources);
    expect(stored).toBe('{#1} - {#2} & "{Not a ref}" & {Missing}');
    expect(unresolved).toEqual(["Missing"]);
    expect(toDisplayExpression("{#1} * 2 & {#99}", sources)).toBe("{Budget} * 2 & {#99}");
  });

  test("keeps evaluating after a column is renamed", () => {
    const renamed = sources.map((source) => (source.id === "1" ? { ...source, title: "Total budget" } : source));
    expect(run("{#1} * 2", { ...context, sources: renamed })).toBe("2000");
  });

  test("shows an ambiguous title as its id", () => {
    const duplicated = [...sources, { id: "9", title: "Budget", kind: "number" as const }];
    expect(toDisplayExpression("{#1} + {#2}", duplicated)).toBe("{#1} + {Spent}");
  });
});
