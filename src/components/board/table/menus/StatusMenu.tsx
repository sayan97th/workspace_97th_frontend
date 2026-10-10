import type { StatusDef } from "../types";
import StatusOptionGrid from "../../cells/StatusOptionGrid";
import type { BoardOptionActions } from "../../cells/EditLabelsPanel";
import PopoverPanel from "./PopoverPanel";

interface StatusMenuProps {
  status_defs: StatusDef[];
  /** The cell's current label id, or null when it has no status. */
  selected_id: string | null;
  onPick: (id: string) => void;
  /** Sets the cell back to no status (the blank pill). */
  onClear: () => void;
  /** Rename/recolor/delete for the inline "Edit Labels" view. Omit to hide its footer. */
  option_actions?: BoardOptionActions;
  /** Appends a label from the "+ New label" field. */
  onCreateOption?: (option: { label: string; color: string }) => void;
  onClose: () => void;
}

/**
 * The table's Status cell menu. Renders the shared monday style
 * {@link StatusOptionGrid} (label columns, blank pill, inline "Edit Labels"),
 * so the table picks and edits labels exactly like every other Status cell.
 * The grid draws its own card, so the panel is `unstyled`.
 */
export default function StatusMenu({ status_defs, selected_id, onPick, onClear, option_actions, onCreateOption, onClose }: StatusMenuProps) {
  // The fixed blank def is the "no status" pill the grid already renders on its own.
  const editable_defs = status_defs.filter((def) => !def.fixed && def.label);

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <StatusOptionGrid
        options={editable_defs}
        selected_id={selected_id}
        onPick={(option_id) => (option_id === null ? onClear() : onPick(option_id))}
        option_actions={option_actions}
        onCreateOption={
          onCreateOption
            ? async (option) => {
                onCreateOption(option);
                return null;
              }
            : undefined
        }
      />
    </PopoverPanel>
  );
}
