import type { BoardAutomationDefinition, BoardAutomationDto } from "@/types/board-automation";
import type { AutomationBuilderContext } from "./builder/automationCatalog";
import { describeDefinition, sentenceText, type SentencePart } from "./builder/automationSentence";

export type { NamedOption } from "./builder/automationCatalog";

/** The trigger, conditions and actions of a saved automation, older single action rows read as a list of one. */
export function automationDefinition(automation: BoardAutomationDto): BoardAutomationDefinition {
  return {
    trigger_type: automation.trigger_type,
    trigger_column_id: automation.trigger_column_id,
    trigger_value: automation.trigger_value,
    trigger_config: automation.trigger_config ?? {},
    conditions: automation.conditions ?? [],
    actions: automation.actions?.length ? automation.actions : [{ type: automation.action_type, params: automation.action_params ?? {} }],
  };
}

/** One automation as sentence parts, tokens marked so the Manage list can bold them. */
export function describeAutomationParts(automation: BoardAutomationDto, context: AutomationBuilderContext): SentencePart[] {
  return describeDefinition(automationDefinition(automation), context);
}

/** Describes one automation as a plain English sentence, for search and the CSV export. */
export function describeAutomation(automation: BoardAutomationDto, context: AutomationBuilderContext): string {
  return `${sentenceText(describeAutomationParts(automation, context))}.`;
}
