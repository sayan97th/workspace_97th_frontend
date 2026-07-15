"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import NavItemFormModal from "./NavItemFormModal";
import type { CreateNavItemPayload } from "@/types/workspace";
import type { WorkspaceNavApi } from "./useWorkspaceNav";
import {
  BoardGridIcon,
  ChevronRightIcon,
  DashboardIcon,
  FileIcon,
  FolderIcon,
  MoreDotsIcon,
  MultiLevelBoardIcon,
  PortfolioIcon,
  ProjectManagementIcon,
  TemplateIcon,
  WorkflowIcon,
  type IconComponent,
} from "@/icons/workspace-icons";

export type AddNewContentMenuProps = {
  /** Trigger button the menu is anchored to (the sidebar's "+" button). */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Nav api for the active workspace — new items are created at its root. */
  nav: WorkspaceNavApi;
};

/** One naming-dialog-bound leaf/folder option, either a top-level row or a submenu entry. */
type ContentOption = {
  key: string;
  label: string;
  icon: IconComponent;
  dialog_title: string;
  placeholder: string;
  payload: Omit<CreateNavItemPayload, "label">;
};

const BOARD_SUBMENU: ContentOption[] = [
  {
    key: "new-board",
    label: "New Board",
    icon: BoardGridIcon,
    dialog_title: "New Board",
    placeholder: "Board name",
    payload: { type: "leaf", view_key: "board" },
  },
  {
    key: "multi-level-board",
    label: "New multi-level board",
    icon: MultiLevelBoardIcon,
    dialog_title: "New multi-level board",
    placeholder: "Board name",
    payload: { type: "leaf", view_key: "board", display_style: "multi_level" },
  },
  {
    key: "board-template",
    label: "Start with template",
    icon: TemplateIcon,
    dialog_title: "New Board",
    placeholder: "Board name",
    payload: { type: "leaf", view_key: "board", display_style: "template" },
  },
];

const DOC_SUBMENU: ContentOption[] = [
  {
    key: "new-doc",
    label: "New Doc",
    icon: FileIcon,
    dialog_title: "New Doc",
    placeholder: "Doc name",
    payload: { type: "leaf", view_key: "doc" },
  },
  {
    key: "doc-template",
    label: "Start with template",
    icon: TemplateIcon,
    dialog_title: "New Doc",
    placeholder: "Doc name",
    payload: { type: "leaf", view_key: "doc", display_style: "template" },
  },
];

const PM_SUBMENU: ContentOption[] = [
  {
    key: "project",
    label: "Project",
    icon: FileIcon,
    dialog_title: "New Project",
    placeholder: "Project name",
    payload: { type: "leaf", view_key: "project" },
  },
  {
    key: "portfolio",
    label: "Portfolio",
    icon: PortfolioIcon,
    dialog_title: "New Portfolio",
    placeholder: "Portfolio name",
    payload: { type: "leaf", view_key: "portfolio" },
  },
];

const DASHBOARD_OPTION: ContentOption = {
  key: "dashboard",
  label: "Dashboard",
  icon: DashboardIcon,
  dialog_title: "New Dashboard",
  placeholder: "Dashboard name",
  payload: { type: "leaf", view_key: "dashboard" },
};

const WORKFLOW_OPTION: ContentOption = {
  key: "workflow",
  label: "Workflow",
  icon: WorkflowIcon,
  dialog_title: "New Workflow",
  placeholder: "Workflow name",
  payload: { type: "leaf", view_key: "workflow" },
};

const FOLDER_OPTION: ContentOption = {
  key: "folder",
  label: "Folder",
  icon: FolderIcon,
  dialog_title: "New folder",
  placeholder: "Folder name",
  payload: { type: "group" },
};

type SubmenuKey = "board" | "doc" | "pm";

type FormState = { is_open: boolean; option: ContentOption | null };

const CLOSED_FORM: FormState = { is_open: false, option: null };

const row_class =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text transition-colors hover:bg-shell-hover-strong";

/**
 * The sidebar's "Add new" content-type menu, opened from the "+" button next to the
 * workspace switcher. Mirrors the "97 Workspace Menu" design's ADD NEW popover: Board,
 * Doc and Project management expand into a side {@link MenuFlyout}, the rest create
 * directly. Every option ultimately opens {@link NavItemFormModal} to collect a name,
 * then calls {@link WorkspaceNavApi.createItem} — new items land at the workspace root,
 * the same place {@link NavTree}'s own "add at root" control creates them.
 */
const AddNewContentMenu: React.FC<AddNewContentMenuProps> = ({ anchor_el, is_open, onClose, nav }) => {
  const [open_submenu, setOpenSubmenu] = useState<SubmenuKey | null>(null);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);

  const board_row_ref = useRef<HTMLButtonElement>(null);
  const doc_row_ref = useRef<HTMLButtonElement>(null);
  const pm_row_ref = useRef<HTMLButtonElement>(null);

  const closeAll = () => {
    setOpenSubmenu(null);
    onClose();
  };

  const chooseOption = (option: ContentOption) => {
    closeAll();
    setForm({ is_open: true, option });
  };

  const submitForm = async (label: string) => {
    if (!form.option) return;
    await nav.createItem({ ...form.option.payload, label });
  };

  const renderRow = (option: ContentOption) => (
    <button key={option.key} type="button" onClick={() => chooseOption(option)} className={row_class}>
      <span className="flex w-4 flex-none text-shell-text-muted">
        <option.icon size={15} />
      </span>
      <span className="flex-1 text-left">{option.label}</span>
    </button>
  );

  const renderExpandableRow = (
    submenu_key: SubmenuKey,
    label: string,
    Icon: IconComponent,
    row_ref: React.RefObject<HTMLButtonElement | null>
  ) => {
    const is_expanded = open_submenu === submenu_key;
    return (
      <button
        ref={row_ref}
        type="button"
        onClick={() => setOpenSubmenu((current) => (current === submenu_key ? null : submenu_key))}
        className={row_class}
      >
        <span className="flex w-4 flex-none text-shell-text-muted">
          <Icon size={15} />
        </span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`flex flex-none text-shell-text-muted transition-transform ${is_expanded ? "rotate-180" : ""}`}>
          <ChevronRightIcon size={11} />
        </span>
      </button>
    );
  };

  const renderSubmenu = (submenu_key: SubmenuKey, row_ref: React.RefObject<HTMLButtonElement | null>, options: ContentOption[]) => (
    <MenuFlyout
      anchor_el={row_ref.current}
      is_open={open_submenu === submenu_key}
      onClose={() => setOpenSubmenu(null)}
      side="right"
      width={210}
    >
      <div className="p-1.5">{options.map(renderRow)}</div>
    </MenuFlyout>
  );

  return (
    <>
      <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={closeAll} width={230}>
        <div className="p-1.5">
          <div className="px-2.5 pb-2 pt-1.5 font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">
            ADD NEW
          </div>

          {renderExpandableRow("board", "Board", BoardGridIcon, board_row_ref)}
          {renderExpandableRow("doc", "Doc", FileIcon, doc_row_ref)}
          {renderRow(DASHBOARD_OPTION)}
          {renderRow(WORKFLOW_OPTION)}

          <div className="my-1 h-px bg-shell-border" />
          {renderRow(FOLDER_OPTION)}
          <div className="my-1 h-px bg-shell-border" />

          {renderExpandableRow("pm", "Project management", ProjectManagementIcon, pm_row_ref)}

          {/* Decorative, matching the design's un-wired "More" entry — same convention as OverflowControl's "Default item values" row. */}
          <button type="button" disabled className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-shell-text-faint">
            <span className="flex w-4 flex-none text-shell-text-faint">
              <MoreDotsIcon size={15} />
            </span>
            <span className="flex-1 text-left">More</span>
          </button>
        </div>
      </BoardPopover>

      {renderSubmenu("board", board_row_ref, BOARD_SUBMENU)}
      {renderSubmenu("doc", doc_row_ref, DOC_SUBMENU)}
      {renderSubmenu("pm", pm_row_ref, PM_SUBMENU)}

      <NavItemFormModal
        is_open={form.is_open}
        title={form.option?.dialog_title ?? ""}
        submit_label="Create"
        placeholder={form.option?.placeholder}
        onSubmit={submitForm}
        onClose={() => setForm(CLOSED_FORM)}
      />
    </>
  );
};

export default AddNewContentMenu;
