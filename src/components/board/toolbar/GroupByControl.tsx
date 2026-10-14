"use client";
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, GroupByIcon } from "@/icons/board-icons";
import { FeedbackIcon } from "@/icons/board-options-icons";
import { HelpIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import GiveFeedbackModal from "../GiveFeedbackModal";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  type BoardGroupByOption,
  type BoardGroupOrder,
  type BoardToolbarApi,
  type BoardToolbarViewActions,
} from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";
import SaveViewButtons from "./SaveViewButtons";
import ToolbarButton from "./ToolbarButton";
import "./field-menu.css";
import "./filter-panel.css";
import "./toolbar-panel.css";

export type GroupByControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
  /** Wires the footer's "Give feedback" link. Omit to hide it. */
  onSubmitFeedback?: (message: string) => Promise<void>;
};

type GroupOrderOption = { id: BoardGroupOrder; label: string; Icon: typeof ArrowUpIcon };

const ALPHABETICAL_ORDER_OPTIONS: GroupOrderOption[] = [
  { id: "alpha_asc", label: "A → Z", Icon: ArrowUpIcon },
  { id: "alpha_desc", label: "Z → A", Icon: ArrowDownIcon },
];

const ORDER_OPTIONS_BY_KIND: Record<NonNullable<BoardGroupByOption<unknown>["order_kind"]>, GroupOrderOption[]> = {
  labels: [
    { id: "asc", label: "Order of labels", Icon: ArrowUpIcon },
    { id: "desc", label: "Reverse order of labels", Icon: ArrowDownIcon },
    ...ALPHABETICAL_ORDER_OPTIONS,
  ],
  values: [
    { id: "asc", label: "Ascending", Icon: ArrowUpIcon },
    { id: "desc", label: "Descending", Icon: ArrowDownIcon },
    ...ALPHABETICAL_ORDER_OPTIONS,
  ],
  text: ALPHABETICAL_ORDER_OPTIONS,
};

/** Text columns only list A to Z and Z to A, which sort the same as their natural order. */
const ALPHABETICAL_EQUIVALENT: Partial<Record<BoardGroupOrder, BoardGroupOrder>> = { asc: "alpha_asc", desc: "alpha_desc" };

const HELP_TEXT = "Group items into sections by the values of any column. Items with an empty value go to their own group at the end.";

/**
 * Group by button and its monday style panel: "Group items by" with a help tooltip, Clear and Save as new view,
 * a column picker plus a group order picker, "Show empty groups" and a "Give feedback" footer. Styled by
 * `filter-panel.css` and `toolbar-panel.css`, like the Sort, Person and Hide panels. The card has no
 * `overflow: hidden`, so both lists can float past its bottom edge and show every option the window fits.
 */
function GroupByControl<TRow>({ toolbar, view_actions, onSubmitFeedback }: GroupByControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_feedback_open, setIsFeedbackOpen] = useState(false);
  const is_open = toolbar.active_panel === "group";
  const is_grouped = toolbar.group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID;

  const column_options = toolbar.group_by_options.filter((option) => option.id !== BOARD_DEFAULT_GROUP_BY_ID);
  const selected_option = column_options.find((option) => option.id === toolbar.group_by_option_id);
  const order_options = ORDER_OPTIONS_BY_KIND[selected_option?.order_kind ?? "values"];
  const selected_order_id = order_options.some((option) => option.id === toolbar.group_order_direction)
    ? toolbar.group_order_direction
    : ALPHABETICAL_EQUIVALENT[toolbar.group_order_direction] ?? order_options[0].id;
  const selected_order = order_options.find((option) => option.id === selected_order_id) ?? order_options[0];

  const clearGrouping = () => {
    toolbar.setGroupByOptionId(BOARD_DEFAULT_GROUP_BY_ID);
    toolbar.setGroupOrderDirection("asc");
  };

  const selectColumn = (option: BoardGroupByOption<TRow>) => {
    // The order picker changes with the column, so a stale pick never shows a label the new column does not offer.
    if (option.order_kind !== selected_option?.order_kind) toolbar.setGroupOrderDirection("asc");
    toolbar.setGroupByOptionId(option.id);
  };

  const openFeedback = () => {
    toolbar.closePanel();
    setIsFeedbackOpen(true);
  };

  return (
    <>
      <Tooltip content="Group items by any column" className="flex">
        <ToolbarButton
          ref={button_ref}
          label="Group by"
          Icon={GroupByIcon}
          is_open={is_open}
          has_selection={is_grouped}
          variant="accent"
          badge_count={is_grouped ? 1 : undefined}
          onClick={() => toolbar.togglePanel("group")}
        />
      </Tooltip>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={560} unstyled>
        <div className="filter-panel toolbar-panel" role="dialog" aria-label="Group items by">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title">Group items by</h2>
            <Tooltip placement="bottom" content={HELP_TEXT}>
              <span className="filter-panel__help" tabIndex={0} aria-label="About grouping">
                <HelpIcon size={16} />
              </span>
            </Tooltip>
            <div className="filter-panel__header-actions">
              <button type="button" disabled={!is_grouped} onClick={clearGrouping} className="filter-panel__text-button">
                Clear
              </button>
              <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={!is_grouped} />
            </div>
          </div>

          <div className="toolbar-panel__body">
            <div className="toolbar-panel__group-fields">
              <InlineFieldMenu
                className="toolbar-panel__group-column"
                menu_heading="Column options"
                menu_max_height={640}
                options={column_options}
                getOptionId={(option) => option.id}
                getSearchText={(option) => option.label}
                search_placeholder="Search columns"
                empty_label="No columns found"
                isSelected={(option) => option.id === toolbar.group_by_option_id}
                onSelect={selectColumn}
                renderValue={() =>
                  selected_option ? (
                    <>
                      {selected_option.swatch && <ColumnSwatchBadge swatch={selected_option.swatch} size={20} />}
                      <span className="field-menu__label">{selected_option.label}</span>
                    </>
                  ) : (
                    <span className="field-menu__placeholder">Choose column</span>
                  )
                }
                renderOption={(option) => (
                  <>
                    {option.swatch && <ColumnSwatchBadge swatch={option.swatch} size={20} />}
                    <span className="field-menu__label">{option.label}</span>
                  </>
                )}
              />

              {selected_option ? (
                <InlineFieldMenu
                  className="toolbar-panel__group-order"
                  menu_heading="Sort options"
                  options={order_options}
                  getOptionId={(option) => option.id}
                  isSelected={(option) => option.id === selected_order.id}
                  onSelect={(option) => toolbar.setGroupOrderDirection(option.id)}
                  renderValue={() => (
                    <>
                      <selected_order.Icon size={16} className="flex-none" />
                      <span className="field-menu__label">{selected_order.label}</span>
                    </>
                  )}
                  renderOption={(option) => (
                    <>
                      <option.Icon size={16} className="flex-none" />
                      <span className="field-menu__label">{option.label}</span>
                    </>
                  )}
                />
              ) : (
                <Tooltip content="Choose a column first" className="toolbar-panel__group-order">
                  <div className="field-input field-input--placeholder toolbar-panel__group-order-placeholder" aria-disabled>
                    <ArrowUpIcon size={16} className="flex-none" />
                    <span className="field-menu__label">Order of groups</span>
                  </div>
                </Tooltip>
              )}
            </div>

            <button
              type="button"
              role="checkbox"
              aria-checked={toolbar.show_empty_groups}
              disabled={!is_grouped}
              onClick={() => toolbar.setShowEmptyGroups(!toolbar.show_empty_groups)}
              className="toolbar-panel__check-row toolbar-panel__group-toggle"
            >
              <span className="filter-panel__checkbox" data-checked={toolbar.show_empty_groups} aria-hidden>
                {toolbar.show_empty_groups && <CheckIcon size={10} />}
              </span>
              <span className="toolbar-panel__check-label">Show empty groups</span>
            </button>
          </div>

          {onSubmitFeedback && (
            <div className="toolbar-panel__footer">
              <button type="button" onClick={openFeedback} className="toolbar-panel__footer-link">
                <FeedbackIcon size={16} />
                Give feedback
              </button>
            </div>
          )}
        </div>
      </BoardPopover>

      {is_feedback_open &&
        onSubmitFeedback &&
        typeof document !== "undefined" &&
        createPortal(
          <GiveFeedbackModal
            is_open
            description="Tell us what is working, what is not, or what you would like to see when grouping items."
            onSubmit={(message) => onSubmitFeedback(`[Group by] ${message}`)}
            onClose={() => setIsFeedbackOpen(false)}
          />,
          document.body
        )}
    </>
  );
}

export default GroupByControl;
