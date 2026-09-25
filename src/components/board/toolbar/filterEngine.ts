import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type {
  BoardAdvancedFilterGroup,
  BoardAdvancedFilterRow,
  BoardFilterContext,
  BoardFilterField,
  BoardFilterFieldKind,
  BoardFilterJoinOperator,
  BoardFilterOperator,
  BoardPersonOption,
  BoardQuickFilterFacet,
  BoardQuickFilterFacetOption,
} from "./types";

/**
 * The toolbar's filter engine: which conditions each field kind offers, how a
 * rule is evaluated against a row, how Quick filters facets are derived, and how
 * an active rule is described in a chip. Pure functions only, so the same logic
 * can be mirrored one to one by the API's `BoardItemFilterService`.
 */

/** Value id that stands for the viewer in a People rule ("Me"). */
export const BOARD_FILTER_ME_VALUE = "__me__";

/** Quick filters option id for "this cell is empty". */
export const BOARD_FILTER_BLANK_OPTION_ID = "__blank__";

/** Virtual field id for the board's groups (tables). */
export const BOARD_FILTER_GROUP_FIELD_ID = "__group__";

/** Virtual item detail fields, filled from the item itself rather than from a column. */
export const BOARD_FILTER_CREATED_BY_FIELD_ID = "__created_by__";
export const BOARD_FILTER_CREATED_AT_FIELD_ID = "__created_at__";
export const BOARD_FILTER_UPDATED_AT_FIELD_ID = "__updated_at__";

/** Weeks start on Monday on both the client and the API, so "This week" means the same days everywhere. */
const WEEK_OPTIONS = { weekStartsOn: 1 as const };

const DATE_FORMAT = "yyyy-MM-dd";
const MIN_DATE = "0000-01-01";
const MAX_DATE = "9999-12-31";
const EXACT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type OperatorOption = { id: BoardFilterOperator; label: string };

export const BOARD_FILTER_OPERATORS: Record<BoardFilterFieldKind, OperatorOption[]> = {
  option: [
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  people: [
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  group: [
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
  ],
  text: [
    { id: "contains", label: "Contains" },
    { id: "not_contains", label: "Does not contain" },
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "starts_with", label: "Starts with" },
    { id: "ends_with", label: "Ends with" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  number: [
    { id: "equals", label: "=" },
    { id: "not_equals", label: "≠" },
    { id: "greater_than", label: ">" },
    { id: "greater_or_equal", label: "≥" },
    { id: "less_than", label: "<" },
    { id: "less_or_equal", label: "≤" },
    { id: "between", label: "Between" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  date: [
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "before", label: "Is before" },
    { id: "after", label: "Is after" },
    { id: "on_or_before", label: "Is on or before" },
    { id: "on_or_after", label: "Is on or after" },
    { id: "between", label: "Is between" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  checkbox: [
    { id: "is_checked", label: "Is checked" },
    { id: "is_unchecked", label: "Is not checked" },
  ],
};

/** Labels for operators saved before typed conditions existed (only `equals`/`contains` can be missing from a kind's own list). */
const LEGACY_OPERATOR_LABELS: Partial<Record<BoardFilterOperator, string>> = {
  equals: "Is",
  contains: "Contains",
};

export const getOperatorLabel = (kind: BoardFilterFieldKind, operator: BoardFilterOperator): string =>
  BOARD_FILTER_OPERATORS[kind].find((option) => option.id === operator)?.label ??
  LEGACY_OPERATOR_LABELS[operator] ??
  operator;

/** Relative date values offered by a date rule's value picker, next to an exact date. */
export const BOARD_FILTER_DATE_PRESETS: { id: string; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "next_week", label: "Next week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "next_month", label: "Next month" },
  { id: "past", label: "Past dates" },
  { id: "future", label: "Future dates" },
];

/** Quick filters buckets for a date field. A row can sit in several at once (Today is also This week). */
export const BOARD_FILTER_DATE_BUCKETS: BoardQuickFilterFacetOption[] = [
  { id: "overdue", label: "Overdue", dot_color: "#e2445c" },
  { id: "today", label: "Today", dot_color: "#00c875" },
  { id: "tomorrow", label: "Tomorrow", dot_color: "#9cd326" },
  { id: "this_week", label: "This week", dot_color: "#579bfc" },
  { id: "next_week", label: "Next week", dot_color: "#a25ddc" },
  { id: "this_month", label: "This month", dot_color: "#0086c0" },
  { id: "upcoming", label: "Upcoming", dot_color: "#fdab3d" },
];

const formatDay = (date: Date) => format(date, DATE_FORMAT);

/** Today's date in the viewer's own time zone, as `YYYY-MM-DD`. */
export const getTodayIso = (): string => formatDay(new Date());

/** First `YYYY-MM-DD` of any date-ish value (a date column may also carry a time, `YYYY-MM-DDTHH:mm`). */
export const toDayIso = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return EXACT_DATE_PATTERN.test(day) ? day : null;
};

/**
 * Resolves a date rule value to the inclusive day range it covers: an exact
 * `YYYY-MM-DD` is a single day, a preset such as `this_week` is Monday to Sunday.
 * Returns null for anything unrecognized, which leaves the rule incomplete.
 */
export const resolveDateValue = (value: string, today: string): { start: string; end: string } | null => {
  if (EXACT_DATE_PATTERN.test(value)) return { start: value, end: value };
  const now = parseISO(today);
  switch (value) {
    case "today":
      return { start: today, end: today };
    case "tomorrow": {
      const day = formatDay(addDays(now, 1));
      return { start: day, end: day };
    }
    case "yesterday": {
      const day = formatDay(addDays(now, -1));
      return { start: day, end: day };
    }
    case "this_week":
      return { start: formatDay(startOfWeek(now, WEEK_OPTIONS)), end: formatDay(endOfWeek(now, WEEK_OPTIONS)) };
    case "last_week": {
      const week = addWeeks(now, -1);
      return { start: formatDay(startOfWeek(week, WEEK_OPTIONS)), end: formatDay(endOfWeek(week, WEEK_OPTIONS)) };
    }
    case "next_week": {
      const week = addWeeks(now, 1);
      return { start: formatDay(startOfWeek(week, WEEK_OPTIONS)), end: formatDay(endOfWeek(week, WEEK_OPTIONS)) };
    }
    case "this_month":
      return { start: formatDay(startOfMonth(now)), end: formatDay(endOfMonth(now)) };
    case "last_month": {
      const month = addMonths(now, -1);
      return { start: formatDay(startOfMonth(month)), end: formatDay(endOfMonth(month)) };
    }
    case "next_month": {
      const month = addMonths(now, 1);
      return { start: formatDay(startOfMonth(month)), end: formatDay(endOfMonth(month)) };
    }
    case "past":
      return { start: MIN_DATE, end: formatDay(addDays(now, -1)) };
    case "future":
      return { start: formatDay(addDays(now, 1)), end: MAX_DATE };
    default:
      return null;
  }
};

const rangesOverlap = (a: { start: string; end: string }, b: { start: string; end: string }) =>
  a.start <= b.end && b.start <= a.end;

/** Conditions that never need a value. */
export const isValuelessOperator = (operator: BoardFilterOperator | null): boolean =>
  operator === "is_empty" || operator === "is_not_empty" || operator === "is_checked" || operator === "is_unchecked";

/** Whether the rule's value is filled in enough to be applied. Incomplete rules are ignored, like monday does. */
export const isRuleComplete = (rule: BoardAdvancedFilterRow): boolean => {
  if (!rule.column_id || !rule.condition) return false;
  if (isValuelessOperator(rule.condition)) return true;
  const values = rule.values ?? [];
  if (rule.condition === "between") return values.length === 2 && values[0] !== "" && values[1] !== "";
  return values.length > 0 || (rule.value ?? "").trim() !== "";
};

/** The first condition a field offers, used when a rule's column is picked or changed. */
export const getDefaultOperator = (kind: BoardFilterFieldKind): BoardFilterOperator => BOARD_FILTER_OPERATORS[kind][0].id;

/** Whether a picked operator still makes sense for a field kind (used to keep or reset a rule on column change). */
export const isOperatorAllowed = (kind: BoardFilterFieldKind, operator: BoardFilterOperator | null): boolean =>
  !!operator && BOARD_FILTER_OPERATORS[kind].some((option) => option.id === operator);

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** Text conditions, shared by `text` fields and by rules saved before typed conditions existed. */
const evaluateTextOperator = (text: string, operator: BoardFilterOperator, value: string): boolean => {
  const haystack = normalizeText(text);
  const needle = normalizeText(value);
  switch (operator) {
    case "is":
    case "equals":
      return haystack === needle;
    case "is_not":
    case "not_equals":
      return haystack !== needle;
    case "contains":
      return haystack.includes(needle);
    case "not_contains":
      return !haystack.includes(needle);
    case "starts_with":
      return haystack.startsWith(needle);
    case "ends_with":
      return haystack.endsWith(needle);
    case "is_empty":
      return haystack === "";
    case "is_not_empty":
      return haystack !== "";
    default:
      return true;
  }
};

const resolveValueIds = (values: string[], context: BoardFilterContext): string[] =>
  values.flatMap((value) =>
    value === BOARD_FILTER_ME_VALUE ? (context.current_person_id ? [context.current_person_id] : []) : [value]
  );

const toNumber = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const evaluateNumberOperator = (
  number: number | null,
  operator: BoardFilterOperator,
  rule: BoardAdvancedFilterRow
): boolean => {
  if (operator === "is_empty") return number === null;
  if (operator === "is_not_empty") return number !== null;
  if (operator === "between") {
    const [min, max] = (rule.values ?? []).map(toNumber);
    if (number === null || min == null || max == null) return false;
    return number >= Math.min(min, max) && number <= Math.max(min, max);
  }
  const target = toNumber(rule.value);
  if (target === null) return true;
  if (operator === "not_equals") return number !== target;
  if (number === null) return false;
  switch (operator) {
    case "equals":
    case "is":
      return number === target;
    case "greater_than":
      return number > target;
    case "greater_or_equal":
      return number >= target;
    case "less_than":
      return number < target;
    case "less_or_equal":
      return number <= target;
    default:
      return true;
  }
};

const evaluateDateOperator = (
  range: { start: string; end: string } | null,
  operator: BoardFilterOperator,
  rule: BoardAdvancedFilterRow,
  today: string
): boolean => {
  if (operator === "is_empty") return range === null;
  if (operator === "is_not_empty") return range !== null;

  let target: { start: string; end: string } | null;
  if (operator === "between") {
    const [from, to] = rule.values ?? [];
    const from_range = from ? resolveDateValue(from, today) : null;
    const to_range = to ? resolveDateValue(to, today) : null;
    target = from_range && to_range ? { start: from_range.start, end: to_range.end } : null;
  } else {
    target = resolveDateValue(rule.value, today);
  }
  if (!target) return true;
  if (operator === "is_not") return range === null || !rangesOverlap(range, target);
  if (range === null) return false;

  switch (operator) {
    case "is":
    case "equals":
    case "between":
      return rangesOverlap(range, target);
    case "before":
      return range.end < target.start;
    case "after":
      return range.start > target.end;
    case "on_or_before":
      return range.end <= target.end;
    case "on_or_after":
      return range.start >= target.start;
    default:
      return true;
  }
};

/** Evaluates one complete rule against a row. Callers must skip incomplete rules first (see {@link isRuleComplete}). */
export function evaluateFilterRule<TRow>(
  field: BoardFilterField<TRow>,
  row: TRow,
  rule: BoardAdvancedFilterRow,
  context: BoardFilterContext
): boolean {
  const operator = rule.condition!;

  switch (field.kind) {
    case "option":
    case "people":
    case "group": {
      const values = rule.values ?? [];
      // A rule saved before typed conditions existed carries free text in
      // `value` instead of ids in `values`, so it is still matched on text.
      if (!values.length && !isValuelessOperator(operator)) {
        return evaluateTextOperator(field.getText(row), operator, rule.value);
      }
      const row_ids = field.getOptionIds?.(row) ?? [];
      const wanted_ids = resolveValueIds(values, context);
      switch (operator) {
        case "is":
        case "equals":
          return row_ids.some((id) => wanted_ids.includes(id));
        case "is_not":
        case "not_equals":
          return !row_ids.some((id) => wanted_ids.includes(id));
        case "is_empty":
          return row_ids.length === 0;
        case "is_not_empty":
          return row_ids.length > 0;
        default:
          return evaluateTextOperator(field.getText(row), operator, rule.value);
      }
    }
    case "number":
      if (operator === "contains") return evaluateTextOperator(field.getText(row), operator, rule.value);
      return evaluateNumberOperator(field.getNumber?.(row) ?? null, operator, rule);
    case "date":
      if (operator === "contains") return evaluateTextOperator(field.getText(row), operator, rule.value);
      return evaluateDateOperator(field.getDateRange?.(row) ?? null, operator, rule, context.today);
    case "checkbox": {
      const is_checked = field.getChecked?.(row) ?? false;
      if (operator === "is_checked") return is_checked;
      if (operator === "is_unchecked") return !is_checked;
      if (operator === "is_empty") return !is_checked;
      if (operator === "is_not_empty") return is_checked;
      return evaluateTextOperator(field.getText(row), operator, rule.value);
    }
    case "text":
    default:
      return evaluateTextOperator(field.getText(row), operator, rule.value);
  }
}

/** The advanced filter slice {@link buildAdvancedFilterMatcher} evaluates. */
export type BoardAdvancedFilterTree = {
  rules: BoardAdvancedFilterRow[];
  groups: BoardAdvancedFilterGroup[];
  operator: BoardFilterJoinOperator;
};

/** Whether a rule narrows rows: switched on, complete, and pointing at a field that still exists. */
export const isRuleApplicable = <TRow>(rule: BoardAdvancedFilterRow, fields_by_id: Map<string, BoardFilterField<TRow>>) =>
  !rule.is_disabled && isRuleComplete(rule) && fields_by_id.has(rule.column_id!);

const isApplicable = isRuleApplicable;

export const isSubitemField = <TRow>(field: BoardFilterField<TRow> | undefined): boolean => field?.scope === "subitem";

/** The same field, reading as an empty cell. A subitem rule is checked against this for a parent with no subitems. */
const toEmptyField = <TRow>(field: BoardFilterField<TRow>): BoardFilterField<TRow> => ({
  ...field,
  getText: () => "",
  getOptionIds: () => [],
  getNumber: () => null,
  getDateRange: () => null,
  getChecked: () => false,
});

/** Whether any applicable rule of the tree reads a subitem column. */
export function hasSubitemRules<TRow>(tree: BoardAdvancedFilterTree, fields_by_id: Map<string, BoardFilterField<TRow>>): boolean {
  const rules = [...tree.rules, ...tree.groups.flatMap((group) => group.rules)];
  return rules.some((rule) => isApplicable(rule, fields_by_id) && isSubitemField(fields_by_id.get(rule.column_id!)));
}

/** Counts the rules that actually narrow rows: complete, and pointing at a field that still exists. */
export function countActiveAdvancedRules<TRow>(
  tree: BoardAdvancedFilterTree,
  fields_by_id: Map<string, BoardFilterField<TRow>>
): number {
  return (
    tree.rules.filter((rule) => isApplicable(rule, fields_by_id)).length +
    tree.groups.reduce((sum, group) => sum + group.rules.filter((rule) => isApplicable(rule, fields_by_id)).length, 0)
  );
}

/**
 * A row check that can also look at one of the row's subitems: item rules read
 * `row`, subitem rules read `sub_row`, or an empty cell when it is null.
 */
export type BoardPairMatcher<TRow> = (row: TRow, sub_row: TRow | null) => boolean;

/**
 * Builds a row predicate for the Advanced filters tree: top-level rules and
 * groups are combined with the top-level And/Or, each group's own rules with
 * the group's And/Or. Incomplete and paused rules and empty groups are skipped,
 * so a half-configured filter never hides rows. Returns null when nothing applies.
 *
 * The predicate takes a (row, subitem) pair, so a rule on a subitem column is
 * checked against that one subitem. A parent matches when at least one of its
 * subitems makes the whole tree pass (see `deriveBoardRows`).
 */
export function buildAdvancedFilterMatcher<TRow>(
  tree: BoardAdvancedFilterTree,
  fields_by_id: Map<string, BoardFilterField<TRow>>,
  context: BoardFilterContext
): BoardPairMatcher<TRow> | null {
  const combine = (checks: BoardPairMatcher<TRow>[], operator: BoardFilterJoinOperator): BoardPairMatcher<TRow> =>
    operator === "or"
      ? (row, sub_row) => checks.some((check) => check(row, sub_row))
      : (row, sub_row) => checks.every((check) => check(row, sub_row));

  const ruleCheck = (rule: BoardAdvancedFilterRow): BoardPairMatcher<TRow> => {
    const field = fields_by_id.get(rule.column_id!)!;
    if (!isSubitemField(field)) return (row) => evaluateFilterRule(field, row, rule, context);
    const empty_field = toEmptyField(field);
    return (row, sub_row) =>
      sub_row === null ? evaluateFilterRule(empty_field, row, rule, context) : evaluateFilterRule(field, sub_row, rule, context);
  };

  const checks: BoardPairMatcher<TRow>[] = tree.rules.filter((rule) => isApplicable(rule, fields_by_id)).map(ruleCheck);
  for (const group of tree.groups) {
    const group_checks = group.rules.filter((rule) => isApplicable(rule, fields_by_id)).map(ruleCheck);
    if (group_checks.length) checks.push(combine(group_checks, group.join_operator));
  }
  return checks.length ? combine(checks, tree.operator) : null;
}

/** Which Quick filters date buckets a day range falls in. */
const getDateBucketIds = (range: { start: string; end: string } | null, today: string): string[] => {
  if (!range) return [BOARD_FILTER_BLANK_OPTION_ID];
  const ids: string[] = [];
  if (range.end < today) ids.push("overdue");
  for (const bucket of ["today", "tomorrow", "this_week", "next_week", "this_month"]) {
    if (rangesOverlap(range, resolveDateValue(bucket, today)!)) ids.push(bucket);
  }
  if (range.start > today) ids.push("upcoming");
  return ids;
};

const BLANK_OPTION: BoardQuickFilterFacetOption = { id: BOARD_FILTER_BLANK_OPTION_ID, label: "Blank", dot_color: "#c4c4c4" };

/** Whether a field shows up in Quick filters: every kind except free text, unless the field says otherwise. */
export const isQuickFilterable = <TRow>(field: BoardFilterField<TRow>): boolean =>
  field.is_quick_filterable ?? field.kind !== "text";

/**
 * Derives one Quick filters facet per eligible field. Option, People and Group
 * facets list their values plus Blank, Checkbox lists Checked/Unchecked, Date
 * lists relative buckets plus "No date", and Number lists the field's own fixed
 * buckets (Rating stars) or just "Has value"/Blank.
 */
export function buildQuickFilterFacets<TRow>(
  fields: BoardFilterField<TRow>[],
  persons: BoardPersonOption[]
): BoardQuickFilterFacet<TRow>[] {
  return fields.filter(isQuickFilterable).map((field): BoardQuickFilterFacet<TRow> => {
    const base = { id: field.id, label: field.label, swatch: field.swatch, scope: field.scope ?? ("item" as const) };
    switch (field.kind) {
      case "option":
      case "group":
        return {
          ...base,
          options: field.kind === "group" ? field.options ?? [] : [...(field.options ?? []), BLANK_OPTION],
          getOptionIds: (row) => {
            const ids = field.getOptionIds?.(row) ?? [];
            return ids.length ? ids : [BOARD_FILTER_BLANK_OPTION_ID];
          },
        };
      case "people":
        return {
          ...base,
          options: [
            ...(field.options ??
              persons.map((person) => ({ id: person.id, label: person.name, person_id: person.id }))),
            { ...BLANK_OPTION, label: "Unassigned" },
          ],
          getOptionIds: (row) => {
            const ids = field.getOptionIds?.(row) ?? [];
            return ids.length ? ids : [BOARD_FILTER_BLANK_OPTION_ID];
          },
        };
      case "checkbox":
        return {
          ...base,
          options: [
            { id: "checked", label: "Checked", dot_color: "#00c875" },
            { id: "unchecked", label: "Unchecked", dot_color: "#c4c4c4" },
          ],
          getOptionIds: (row) => [field.getChecked?.(row) ? "checked" : "unchecked"],
        };
      case "date":
        return {
          ...base,
          options: [...BOARD_FILTER_DATE_BUCKETS, { ...BLANK_OPTION, label: "No date" }],
          getOptionIds: (row, context) => getDateBucketIds(field.getDateRange?.(row) ?? null, context.today),
        };
      case "number":
        return {
          ...base,
          options: [...(field.options ?? [{ id: "has_value", label: "Has value", dot_color: "#579bfc" }]), BLANK_OPTION],
          getOptionIds: (row) => {
            const number = field.getNumber?.(row) ?? null;
            if (number === null) return [BOARD_FILTER_BLANK_OPTION_ID];
            return field.options ? [String(Math.round(number))] : ["has_value"];
          },
        };
      case "text":
      default:
        return {
          ...base,
          options: [{ id: "has_value", label: "Has value" }, BLANK_OPTION],
          getOptionIds: (row) => [field.getText(row).trim() ? "has_value" : BOARD_FILTER_BLANK_OPTION_ID],
        };
    }
  });
}

const describeOptionIds = <TRow>(field: BoardFilterField<TRow>, ids: string[], persons: BoardPersonOption[]) =>
  ids
    .map((id) => {
      if (id === BOARD_FILTER_ME_VALUE) return "Me";
      return (
        field.options?.find((option) => option.id === id)?.label ??
        persons.find((person) => person.id === id)?.name ??
        id
      );
    })
    .join(", ");

const describeDateValue = (value: string) =>
  BOARD_FILTER_DATE_PRESETS.find((preset) => preset.id === value)?.label ?? value;

/** Human readable summary of a complete rule, e.g. "Status is Done, Stuck" or "Due date is this week". */
export function describeFilterRule<TRow>(
  field: BoardFilterField<TRow>,
  rule: BoardAdvancedFilterRow,
  persons: BoardPersonOption[]
): string {
  const operator = rule.condition!;
  const operator_label = getOperatorLabel(field.kind, operator).toLowerCase();
  if (isValuelessOperator(operator)) return `${field.label} ${operator_label}`;

  const values = rule.values ?? [];
  let value_label: string;
  if (operator === "between") {
    const [from, to] = field.kind === "date" ? values.map(describeDateValue) : values;
    value_label = `${from} and ${to}`;
  } else if (values.length && (field.kind === "option" || field.kind === "people" || field.kind === "group")) {
    value_label = describeOptionIds(field, values, persons);
  } else if (field.kind === "date") {
    value_label = describeDateValue(rule.value).toLowerCase();
  } else if (field.kind === "number") {
    value_label = rule.value;
  } else {
    value_label = `"${rule.value}"`;
  }
  return `${field.label} ${operator_label} ${value_label}`;
}

/**
 * The rule a cell's "Filter by this value" adds: the row's own value in that
 * field, compared with the field's natural "is" condition (or "is empty" when
 * the cell is blank). `exclude` builds the opposite rule ("Is not").
 */
export function buildRuleFromRowValue<TRow>(
  field: BoardFilterField<TRow>,
  row: TRow,
  exclude = false
): Omit<BoardAdvancedFilterRow, "id"> {
  const base = { column_id: field.id, value: "", values: [] as string[] };
  switch (field.kind) {
    case "option":
    case "people":
    case "group": {
      const ids = field.getOptionIds?.(row) ?? [];
      if (!ids.length) return { ...base, condition: exclude ? "is_not_empty" : "is_empty" };
      return { ...base, condition: exclude ? "is_not" : "is", values: ids };
    }
    case "checkbox": {
      const is_checked = field.getChecked?.(row) ?? false;
      return { ...base, condition: is_checked !== exclude ? "is_checked" : "is_unchecked" };
    }
    case "number": {
      const number = field.getNumber?.(row) ?? null;
      if (number === null) return { ...base, condition: exclude ? "is_not_empty" : "is_empty" };
      return { ...base, condition: exclude ? "not_equals" : "equals", value: String(number) };
    }
    case "date": {
      const range = field.getDateRange?.(row) ?? null;
      if (!range) return { ...base, condition: exclude ? "is_not_empty" : "is_empty" };
      if (range.start === range.end) return { ...base, condition: exclude ? "is_not" : "is", value: range.start };
      return exclude
        ? { ...base, condition: "is_not", value: range.start }
        : { ...base, condition: "between", values: [range.start, range.end] };
    }
    case "text":
    default: {
      const text = field.getText(row).trim();
      if (!text) return { ...base, condition: exclude ? "is_not_empty" : "is_empty" };
      return { ...base, condition: exclude ? "is_not" : "is", value: text };
    }
  }
}

type QuickRuleDraft = Omit<BoardAdvancedFilterRow, "id">;

/** The Advanced rule equivalent to picking (or, with `exclude`, excluding) one Quick filters option. Null when there is none. */
const quickOptionToRule = <TRow>(field: BoardFilterField<TRow>, option_id: string, exclude: boolean): QuickRuleDraft | null => {
  const base = { column_id: field.id, value: "", values: [] as string[] };
  if (option_id === BOARD_FILTER_BLANK_OPTION_ID) return { ...base, condition: exclude ? "is_not_empty" : "is_empty" };
  switch (field.kind) {
    case "option":
    case "people":
    case "group":
      return { ...base, condition: exclude ? "is_not" : "is", values: [option_id] };
    case "checkbox":
      return { ...base, condition: (option_id === "checked") !== exclude ? "is_checked" : "is_unchecked" };
    case "number":
      if (option_id === "has_value") return { ...base, condition: exclude ? "is_empty" : "is_not_empty" };
      return { ...base, condition: exclude ? "not_equals" : "equals", value: option_id };
    case "date":
      if (option_id === "overdue") return { ...base, condition: exclude ? "on_or_after" : "before", value: "today" };
      if (option_id === "upcoming") return { ...base, condition: exclude ? "on_or_before" : "after", value: "today" };
      return { ...base, condition: exclude ? "is_not" : "is", value: option_id };
    case "text":
    default:
      if (option_id === "has_value") return { ...base, condition: exclude ? "is_empty" : "is_not_empty" };
      return null;
  }
};

const isOptionKind = (kind: BoardFilterFieldKind) => kind === "option" || kind === "people" || kind === "group";

/**
 * Advanced rules equivalent to one Quick filters facet. Picks become a single
 * rule when one is enough (option fields merge every picked value into one
 * "Is" rule), or an Or group when several are needed. Each exclusion becomes
 * its own rule, joined with And like Quick filters apply them.
 */
export function buildRulesFromQuickFacet<TRow>(
  field: BoardFilterField<TRow>,
  selected_ids: string[],
  excluded_ids: string[]
): { rules: QuickRuleDraft[]; or_group: QuickRuleDraft[] | null } {
  const toRules = (ids: string[], exclude: boolean): QuickRuleDraft[] => {
    if (!isOptionKind(field.kind)) {
      return ids.map((id) => quickOptionToRule(field, id, exclude)).filter((rule): rule is QuickRuleDraft => rule !== null);
    }
    const value_ids = ids.filter((id) => id !== BOARD_FILTER_BLANK_OPTION_ID);
    const rules: QuickRuleDraft[] = value_ids.length
      ? [{ column_id: field.id, condition: exclude ? "is_not" : "is", value: "", values: value_ids }]
      : [];
    if (ids.includes(BOARD_FILTER_BLANK_OPTION_ID)) rules.push(quickOptionToRule(field, BOARD_FILTER_BLANK_OPTION_ID, exclude)!);
    return rules;
  };

  const include_rules = toRules(selected_ids, false);
  const exclude_rules = toRules(excluded_ids, true);
  if (include_rules.length <= 1) return { rules: [...include_rules, ...exclude_rules], or_group: null };
  return { rules: exclude_rules, or_group: include_rules };
}
