"use client";
import "@xyflow/react/dist/style.css";
import React, { useMemo } from "react";
import { Background, BackgroundVariant, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Filter, GitFork, Hourglass, Play, Zap } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { BoardAutomationAction, BoardAutomationCondition } from "@/types/board-automation";
import type { AutomationBuilderContext } from "./automationCatalog";
import { actionParts, conditionParts, triggerParts, type SentencePart } from "./automationSentence";
import { allConditions, draftToDefinition, hasNoElseBranch, type AutomationDraft } from "./builderDraft";

/**
 * The automation as a read-only diagram, next to the sentence builder: the trigger, the "and only
 * if" conditions, the "Then" and "Otherwise" branches and every action and wait in order, drawn with
 * React Flow. Clicking a card goes back to the sentence to edit it.
 */

type FlowCardKind = "trigger" | "conditions" | "action" | "wait" | "empty";

type FlowCardData = {
  kind: FlowCardKind;
  /** The small caps heading: When, Only if, Then, Otherwise, Wait. */
  heading: string;
  /** Each entry is one line of the card, its tokens in bold. */
  lines: SentencePart[][];
  /** Set on the first card of a branch that only some items reach. */
  branch?: "then" | "else";
};

type FlowCardNode = Node<FlowCardData, "card">;

const CARD_WIDTH = 300;
const ROW_GAP = 150;
const BRANCH_OFFSET = 190;

const KIND_STYLES: Record<FlowCardKind, { accent: string; icon: React.ReactNode }> = {
  trigger: { accent: "#0073ea", icon: <Zap size={14} /> },
  conditions: { accent: "#fdab3d", icon: <Filter size={14} /> },
  action: { accent: "#00854d", icon: <Play size={14} /> },
  wait: { accent: "#ff9f1a", icon: <Hourglass size={14} /> },
  empty: { accent: "#c4c4c4", icon: <GitFork size={14} /> },
};

function SentenceLine({ parts }: { parts: SentencePart[] }) {
  return (
    <span>
      {parts.map((part, index) => (part.is_token ? <strong key={index} className="font-semibold text-boardtree-text">{part.text}</strong> : <span key={index}>{part.text}</span>))}
    </span>
  );
}

/** One card of the diagram, a colored bar on the left like the builder's sentence lines. */
function FlowCard({ data }: NodeProps<FlowCardNode>) {
  const style = KIND_STYLES[data.kind];
  return (
    <div
      className={`rounded-[10px] border bg-boardtree-surface px-3 py-2.5 text-left shadow-[0_2px_8px_rgba(30,34,55,0.08)] ${data.kind === "wait" || data.kind === "empty" ? "border-dashed border-boardtree-border" : "border-boardtree-border-soft"}`}
      style={{ width: CARD_WIDTH, borderLeft: `4px solid ${style.accent}` }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-boardtree-border" />
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: style.accent }}>
        {style.icon}
        {data.heading}
      </div>
      <div className="flex flex-col gap-1 text-[12.5px] leading-snug text-boardtree-text-secondary">
        {data.lines.map((line, index) => <SentenceLine key={index} parts={line} />)}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-boardtree-border" />
    </div>
  );
}

const NODE_TYPES = { card: FlowCard };

/** The lines of the conditions card: each top-level rule, then each group in brackets. */
function conditionLines(draft: AutomationDraft, context: AutomationBuilderContext): SentencePart[][] {
  const joiner = draft.condition_operator === "or" ? "or " : "and ";
  const complete = (rules: BoardAutomationCondition[]) => rules.filter((rule) => rule.column_id && rule.condition);
  const lines: SentencePart[][] = complete(draft.conditions).map((rule, index) => [...(index > 0 ? [{ text: joiner }] : []), ...conditionParts(rule, context)]);
  draft.condition_groups.forEach((group, index) => {
    const rules = complete(group.rules);
    if (rules.length === 0) return;
    const inner = rules.flatMap((rule, rule_index) => [...(rule_index > 0 ? [{ text: group.join_operator === "or" ? " or " : " and " }] : []), ...conditionParts(rule, context)]);
    lines.push([...(lines.length > 0 || index > 0 ? [{ text: joiner }] : []), { text: "(" }, ...inner, { text: ")" }]);
  });
  return lines;
}

/** Cards and arrows for one branch of actions, starting at `(x, y)` below `from`. */
function branchElements(actions: BoardAutomationAction[], context: AutomationBuilderContext, branch: "then" | "else", x: number, y: number, from: string, edge_label?: string): { nodes: FlowCardNode[]; edges: Edge[] } {
  const nodes: FlowCardNode[] = [];
  const edges: Edge[] = [];
  let previous = from;

  const list = actions.length ? actions : [null];
  list.forEach((action, index) => {
    const id = `${branch}_${index}`;
    const is_wait = action?.type === "wait";
    nodes.push({
      id,
      type: "card",
      position: { x, y: y + index * ROW_GAP },
      data: {
        kind: action ? (is_wait ? "wait" : "action") : "empty",
        heading: index === 0 ? (branch === "else" ? "Otherwise" : "Then") : is_wait ? "Wait" : "And",
        lines: [action ? actionParts(action, context) : [{ text: "Choose what happens" }]],
        branch: index === 0 ? branch : undefined,
      },
    });
    edges.push({
      id: `${previous}->${id}`,
      source: previous,
      target: id,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      label: index === 0 ? edge_label : undefined,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      style: branch === "else" ? { strokeDasharray: "5 4" } : undefined,
    });
    previous = id;
  });

  return { nodes, edges };
}

export type AutomationFlowViewProps = {
  draft: AutomationDraft;
  context: AutomationBuilderContext;
  /** Goes back to the sentence builder, a card was clicked to edit it. */
  onEdit: () => void;
};

export default function AutomationFlowView({ draft, context, onEdit }: AutomationFlowViewProps) {
  const { resolved_theme } = useTheme();

  const { nodes, edges } = useMemo(() => {
    const flow_nodes: FlowCardNode[] = [];
    const flow_edges: Edge[] = [];
    const definition = draft.trigger_type ? draftToDefinition(draft) : null;
    const has_else = !hasNoElseBranch(draft.trigger_type) && draft.else_actions.length > 0 && allConditions(draft).length > 0;
    const then_x = has_else ? -BRANCH_OFFSET : 0;

    flow_nodes.push({
      id: "trigger",
      type: "card",
      position: { x: 0, y: 0 },
      data: { kind: "trigger", heading: "When", lines: [definition ? triggerParts(definition, context) : [{ text: "Choose what starts the automation" }]] },
    });

    let branch_from = "trigger";
    let next_y = ROW_GAP;
    const condition_lines = conditionLines(draft, context);
    if (condition_lines.length > 0) {
      flow_nodes.push({ id: "conditions", type: "card", position: { x: 0, y: ROW_GAP }, data: { kind: "conditions", heading: "Only if", lines: condition_lines } });
      flow_edges.push({ id: "trigger->conditions", source: "trigger", target: "conditions", type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
      branch_from = "conditions";
      next_y = ROW_GAP + Math.max(ROW_GAP, 70 + condition_lines.length * 26);
    }

    const then_branch = branchElements(definition?.actions ?? [], context, "then", then_x, next_y, branch_from, has_else ? "Yes" : undefined);
    flow_nodes.push(...then_branch.nodes);
    flow_edges.push(...then_branch.edges);

    if (has_else && definition) {
      const else_branch = branchElements(definition.else_actions ?? [], context, "else", BRANCH_OFFSET + 40, next_y, branch_from, "No");
      flow_nodes.push(...else_branch.nodes);
      flow_edges.push(...else_branch.edges);
    }

    return { nodes: flow_nodes, edges: flow_edges };
  }, [draft, context]);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-[12px] border border-boardtree-border-soft bg-boardtree-panel-alt" aria-label="Automation diagram">
      <ReactFlow
        key={nodes.map((node) => node.id).join("|")}
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        colorMode={resolved_theme}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={onEdit}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
