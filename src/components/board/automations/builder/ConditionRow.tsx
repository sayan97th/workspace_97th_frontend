"use client";
import React from "react";
import type { AutomationBuilderContext } from "./automationCatalog";
import { conditionFieldLabel, conditionOperatorLabel, conditionValueLabel } from "./automationSentence";
import type { ConditionDraft } from "./builderDraft";
import { Token } from "./builderUi";
import { ConditionFieldPicker, ConditionOperatorPicker, ConditionValueEditor, conditionKind, conditionNeedsValue, defaultConditionOperator } from "./valueEditors";

export type ConditionRowProps = {
  condition: ConditionDraft;
  is_first: boolean;
  /** Replaces the leading "and", e.g. with an and/or switch. */
  lead?: React.ReactNode;
  /** Subitem triggers check the subitem's own columns. */
  scope: "item" | "subitem";
  context: AutomationBuilderContext;
  onChange: (next: ConditionDraft) => void;
};

const EMPTY_SUBITEM_RULE = { column_id: "", condition: "", value: "", values: [] };

/**
 * One "and only if" rule: "and only if Priority is High", "and Due date is before today". A
 * "Subitems" rule goes on with the rule its subitems are checked against: "and only if Subitems
 * all match, where Status is Done".
 */
export default function ConditionRow({ condition, is_first, lead, scope, context, onChange }: ConditionRowProps) {
  const kind = condition.column_id ? conditionKind(context, condition.column_id) : null;
  const has_value = condition.values.length > 0 || condition.value !== "";
  // A column id that no longer matches a column or an item detail was deleted.
  const is_invalid = condition.column_id !== "" && kind === null;

  return (
    <>
      {lead ?? <span className="text-boardtree-text">{is_first ? "And only if " : "and "}</span>}
      <Token
        label={is_invalid ? "deleted column" : condition.column_id ? conditionFieldLabel(context, condition.column_id) : "column"}
        is_placeholder={!condition.column_id}
        is_invalid={is_invalid}
        aria_label="Condition column"
      >
        {(close) => (
          <ConditionFieldPicker
            context={context}
            scope={scope}
            selected={condition.column_id}
            onPick={(field_id) => {
              const next_kind = conditionKind(context, field_id);
              onChange({
                ...condition,
                column_id: field_id,
                condition: next_kind ? defaultConditionOperator(next_kind) : "",
                value: "",
                values: [],
                subitem_rule: next_kind === "subitems" ? { ...EMPTY_SUBITEM_RULE } : null,
              });
              close();
            }}
          />
        )}
      </Token>{" "}
      <Token label={conditionOperatorLabel(context, condition)} disabled={!kind} aria_label="Condition operator" popover_width={240}>
        {(close) =>
          kind ? (
            <ConditionOperatorPicker
              kind={kind}
              selected={condition.condition}
              onPick={(operator) => {
                const keeps_values = operator !== "between" && condition.condition !== "between" && kind !== "dependency";
                onChange({ ...condition, condition: operator, ...(keeps_values ? {} : { value: "", values: [] }) });
                close();
              }}
            />
          ) : null
        }
      </Token>
      {kind && conditionNeedsValue(condition.condition, kind) && (
        <>
          {" "}
          <Token label={has_value ? conditionValueLabel(context, condition) : "something"} is_placeholder={!has_value} aria_label="Condition value" popover_width={kind === "dependency" ? 300 : undefined}>
            {(close) => (
              <ConditionValueEditor
                context={context}
                condition={condition}
                kind={kind}
                onApply={(next) => {
                  onChange({ ...condition, ...next });
                  close();
                }}
              />
            )}
          </Token>
        </>
      )}
      {kind === "subitems" && (
        <ConditionRow
          condition={{ ...EMPTY_SUBITEM_RULE, ...(condition.subitem_rule ?? {}), key: `${condition.key}_subitem` }}
          is_first={false}
          lead={<span className="text-boardtree-text">, where </span>}
          scope="subitem"
          context={context}
          onChange={(next) => onChange({ ...condition, subitem_rule: { column_id: next.column_id, condition: next.condition, value: next.value, values: next.values } })}
        />
      )}
    </>
  );
}
