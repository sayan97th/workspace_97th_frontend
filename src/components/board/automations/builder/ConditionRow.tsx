"use client";
import React from "react";
import type { BoardAutomationDynamicSource } from "@/types/board-automation";
import { DYNAMIC_EXCLUDED_OPERATORS, type AutomationBuilderContext } from "./automationCatalog";
import { conditionFieldLabel, conditionOperatorLabel, conditionValueLabel } from "./automationSentence";
import type { ConditionDraft } from "./builderDraft";
import { Token } from "./builderUi";
import { DynamicValueEditor, FixedOrDynamic, canUseDynamicCondition, conditionDynamicFamily } from "./dynamicValues";
import { ConditionFieldPicker, ConditionOperatorPicker, ConditionValueEditor, conditionKind, conditionNeedsValue, defaultConditionOperator } from "./valueEditors";

export type ConditionRowProps = {
  condition: ConditionDraft;
  is_first: boolean;
  /** Replaces the leading "and", e.g. with an and/or switch. */
  lead?: React.ReactNode;
  /** Subitem triggers check the subitem's own columns. */
  scope: "item" | "subitem";
  context: AutomationBuilderContext;
  /** Offer dynamic values ("today + 3 days", "the item creator"). The rule inside a "subitems" condition has none. */
  allow_dynamic?: boolean;
  /** Dynamic sources that mean nothing here, a digest has no person who made the change. */
  dynamic_exclude?: BoardAutomationDynamicSource[];
  /** Item details the field picker leaves out. */
  exclude_fields?: string[];
  onChange: (next: ConditionDraft) => void;
};

const EMPTY_SUBITEM_RULE = { column_id: "", condition: "", value: "", values: [] };

/**
 * One "and only if" rule: "and only if Priority is High", "and Due date is before today". A
 * "Subitems" rule goes on with the rule its subitems are checked against: "and only if Subitems
 * all match, where Status is Done". Its value can also be dynamic: "and Owner is the person who made
 * the change", "and Due date is before today + 3 days".
 */
export default function ConditionRow({ condition, is_first, lead, scope, context, allow_dynamic = true, dynamic_exclude = [], exclude_fields = [], onChange }: ConditionRowProps) {
  const kind = condition.column_id ? conditionKind(context, condition.column_id) : null;
  const has_value = condition.values.length > 0 || condition.value !== "" || Boolean(condition.dynamic?.source);
  // A column id that no longer matches a column or an item detail was deleted.
  const is_invalid = condition.column_id !== "" && kind === null;
  const dynamic_family = conditionDynamicFamily(context, condition.column_id);
  const can_be_dynamic = allow_dynamic && canUseDynamicCondition(context, condition);

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
            exclude_fields={exclude_fields}
            onPick={(field_id) => {
              const next_kind = conditionKind(context, field_id);
              onChange({
                ...condition,
                column_id: field_id,
                condition: next_kind ? defaultConditionOperator(next_kind) : "",
                value: "",
                values: [],
                dynamic: null,
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
                const keeps_dynamic = !DYNAMIC_EXCLUDED_OPERATORS.includes(operator);
                onChange({ ...condition, condition: operator, ...(keeps_values ? {} : { value: "", values: [] }), ...(keeps_dynamic ? {} : { dynamic: null }) });
                close();
              }}
            />
          ) : null
        }
      </Token>
      {kind && conditionNeedsValue(condition.condition, kind) && (
        <>
          {" "}
          <Token
            label={has_value ? conditionValueLabel(context, condition) : "something"}
            is_placeholder={!has_value}
            aria_label="Condition value"
            popover_width={kind === "dependency" || can_be_dynamic ? 310 : undefined}
          >
            {(close) => {
              const fixed = (
                <ConditionValueEditor
                  context={context}
                  condition={condition}
                  kind={kind}
                  onApply={(next) => {
                    onChange({ ...condition, ...next, dynamic: null });
                    close();
                  }}
                />
              );
              if (!can_be_dynamic || !dynamic_family) return fixed;
              return (
                <FixedOrDynamic
                  is_dynamic={Boolean(condition.dynamic?.source)}
                  dynamic={
                    <DynamicValueEditor
                      context={context}
                      family={dynamic_family}
                      value={condition.dynamic}
                      scopes={[scope]}
                      exclude={dynamic_exclude}
                      onApply={(dynamic) => {
                        onChange({ ...condition, dynamic, value: "", values: [] });
                        close();
                      }}
                    />
                  }
                >
                  {fixed}
                </FixedOrDynamic>
              );
            }}
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
          allow_dynamic={false}
          onChange={(next) => onChange({ ...condition, subitem_rule: { column_id: next.column_id, condition: next.condition, value: next.value, values: next.values } })}
        />
      )}
    </>
  );
}
