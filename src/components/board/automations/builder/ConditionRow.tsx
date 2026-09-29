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
  /** Subitem triggers check the subitem's own columns. */
  scope: "item" | "subitem";
  context: AutomationBuilderContext;
  onChange: (next: ConditionDraft) => void;
};

/** One "and only if" rule: "and only if Priority is High", "and Due date is before today". */
export default function ConditionRow({ condition, is_first, scope, context, onChange }: ConditionRowProps) {
  const kind = condition.column_id ? conditionKind(context, condition.column_id) : null;
  const has_value = condition.values.length > 0 || condition.value !== "";

  return (
    <>
      <span className="text-boardtree-text">{is_first ? "And only if " : "and "}</span>
      <Token label={condition.column_id ? conditionFieldLabel(context, condition.column_id) : "column"} is_placeholder={!condition.column_id} aria_label="Condition column">
        {(close) => (
          <ConditionFieldPicker
            context={context}
            scope={scope}
            selected={condition.column_id}
            onPick={(field_id) => {
              const next_kind = conditionKind(context, field_id);
              onChange({ ...condition, column_id: field_id, condition: next_kind ? defaultConditionOperator(next_kind) : "", value: "", values: [] });
              close();
            }}
          />
        )}
      </Token>{" "}
      <Token label={conditionOperatorLabel(context, condition)} disabled={!kind} aria_label="Condition operator" popover_width={220}>
        {(close) =>
          kind ? (
            <ConditionOperatorPicker
              kind={kind}
              selected={condition.condition}
              onPick={(operator) => {
                const keeps_values = operator !== "between" && condition.condition !== "between";
                onChange({ ...condition, condition: operator, ...(keeps_values ? {} : { value: "", values: [] }) });
                close();
              }}
            />
          ) : null
        }
      </Token>
      {kind && conditionNeedsValue(condition.condition) && (
        <>
          {" "}
          <Token label={has_value ? conditionValueLabel(context, condition) : "something"} is_placeholder={!has_value} aria_label="Condition value">
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
    </>
  );
}
