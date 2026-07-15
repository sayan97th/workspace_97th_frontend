"use client";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkspaceNavNode } from "@/types/workspace";
import { CloseIcon, FolderIcon, HomeIcon } from "@/icons/workspace-icons";

export type MoveNavItemModalProps = {
  is_open: boolean;
  tree: WorkspaceNavNode[];
  moving_node: WorkspaceNavNode | null;
  onSubmit: (parent_id: number | null) => void | Promise<void>;
  onClose: () => void;
};

type TargetOption = { id: number | null; label: string; depth: number };

/**
 * Collect every group that can legally receive `moving_node`: all folders except
 * the node itself and its descendants (moving into those would create a cycle).
 * A synthetic "Workspace root" option (parent_id = null) is prepended.
 */
const collectTargets = (
  nodes: WorkspaceNavNode[],
  moving_node: WorkspaceNavNode | null,
  depth = 0
): TargetOption[] => {
  const targets: TargetOption[] = [];
  for (const node of nodes) {
    if (node.type !== "group") continue;
    if (moving_node && node.id === moving_node.id) continue; // skip self + subtree
    targets.push({ id: node.id, label: node.label, depth });
    targets.push(...collectTargets(node.children, moving_node, depth + 1));
  }
  return targets;
};

const MoveNavItemModal: React.FC<MoveNavItemModalProps> = ({
  is_open,
  tree,
  moving_node,
  onSubmit,
  onClose,
}) => {
  const [is_saving, setIsSaving] = useState(false);

  const options = useMemo<TargetOption[]>(
    () => [
      { id: null, label: "Workspace root", depth: 0 },
      ...collectTargets(tree, moving_node),
    ],
    [tree, moving_node]
  );

  if (!is_open || !moving_node || typeof document === "undefined") return null;

  const handleSelect = async (parent_id: number | null) => {
    if (parent_id === moving_node.parent_id) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(parent_id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Move ${moving_node.label}`}
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[70vh] w-[400px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex flex-none items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="truncate text-base font-semibold tracking-[-0.01em]">
            Move &ldquo;{moving_node.label}&rdquo;
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
          {options.map((option) => (
            <button
              key={option.id ?? "root"}
              type="button"
              disabled={is_saving}
              onClick={() => handleSelect(option.id)}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left text-sm text-shell-text transition-colors hover:bg-shell-hover disabled:opacity-50"
              style={{ paddingLeft: 10 + option.depth * 18 }}
            >
              <span className="flex flex-none text-shell-text-muted">
                {option.id === null ? <HomeIcon size={15} /> : <FolderIcon size={15} />}
              </span>
              <span className="flex-1 truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MoveNavItemModal;
