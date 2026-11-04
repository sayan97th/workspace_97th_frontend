"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import CreateContentModal, { CREATE_CONTENT_KINDS, type CreateContentKind, type CreateContentValues } from "./CreateContentModal";
import BoardTemplatePickerModal, { type TemplateKind } from "./BoardTemplatePickerModal";
import { getLeafHref } from "./helpers";
import type { CreateNavItemPayload, WorkspaceNavNode } from "@/types/workspace";
import type { WorkspaceNavApi } from "./useWorkspaceNav";
import { ImportIcon } from "@/icons/board-options-icons";
import {
  AppsGridIcon,
  BoardGridIcon,
  DashboardIcon,
  FileIcon,
  ImageIcon,
  MoreDotsIcon,
  MultiLevelBoardIcon,
  PencilIcon,
  PortfolioIcon,
  ProjectManagementIcon,
  SidebarFolderIcon,
  TemplateIcon,
} from "@/icons/workspace-icons";

export type AddNewContentMenuProps = {
  /** Trigger button the menu is anchored to (a sidebar "+" button). */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Nav api for the active workspace, new items are created in its tree. */
  nav: WorkspaceNavApi;
  /** Folder new items land in, the workspace root when omitted. */
  parent_id?: number | null;
  align?: "start" | "end";
};

/** What one create row makes, collected by {@link CreateContentModal} before it reaches the API. */
type CreateOption = {
  kind: CreateContentKind;
  payload: Omit<CreateNavItemPayload, "label" | "parent_id" | "board_type">;
  /** Opens the board's import wizard once it exists ("Import data" rows). */
  opens_import?: boolean;
};

/** Same floor as the Administration page, where installed apps are managed. */
const APP_ADMIN_ROLES = ["super_admin", "admin", "staff"];
const INTEGRATIONS_HREF = "/administration?section=integrations";
const ICON_SIZE = 16;

const leafOption = (kind: CreateContentKind, view_key: string, display_style?: string): CreateOption => ({
  kind,
  payload: { type: "leaf", view_key, ...(display_style ? { display_style } : {}) },
});

const BOARD = leafOption(CREATE_CONTENT_KINDS.board, "board");
const MULTI_LEVEL_BOARD = leafOption(CREATE_CONTENT_KINDS.multi_level_board, "board", "multi_level");
const DOC = leafOption(CREATE_CONTENT_KINDS.doc, "doc");
const DASHBOARD = leafOption(CREATE_CONTENT_KINDS.dashboard, "dashboard");
const PROJECT = leafOption(CREATE_CONTENT_KINDS.project, "project");
const PORTFOLIO = leafOption(CREATE_CONTENT_KINDS.portfolio, "portfolio");
const FORM = leafOption(CREATE_CONTENT_KINDS.form, "form");
const CANVAS = leafOption(CREATE_CONTENT_KINDS.canvas, "canvas");
const FOLDER: CreateOption = { kind: CREATE_CONTENT_KINDS.folder, payload: { type: "group" } };

const importOption = (title: string): CreateOption => ({ ...BOARD, kind: { ...CREATE_CONTENT_KINDS.board, title }, opens_import: true });

const IMPORT_EXCEL = importOption("Import from Excel");
const IMPORT_CSV = importOption("Import from CSV");

/**
 * The sidebar's "Add to workspace" menu, laid out like monday.com's: content
 * types first (Board and Doc are split rows, a click creates, the chevron
 * shows their variants), then Folder and More. Every create row opens
 * {@link CreateContentModal}, the monday style "Create ..." dialog that asks
 * for a name and, for boards, docs and dashboards, the privacy (Main, Private
 * or Shareable), then creates the item through
 * {@link WorkspaceNavApi.createItem} and opens it. "Start with template"
 * rows open {@link BoardTemplatePickerModal} with the saved templates. Opened from the "+" next
 * to the workspace switcher and from the "+" in the Content header.
 */
const AddNewContentMenu: React.FC<AddNewContentMenuProps> = ({ anchor_el, is_open, onClose, nav, parent_id = null, align = "start" }) => {
  const router = useRouter();
  const toast = useToast();
  const { hasAnyRole } = useAuth();
  const [create_option, setCreateOption] = useState<CreateOption | null>(null);
  const [template_kind, setTemplateKind] = useState<TemplateKind | null>(null);

  const can_manage_apps = hasAnyRole(...APP_ADMIN_ROLES);

  const createRow = (key: string, label: string, icon: React.ReactNode, option: CreateOption): ActionMenuItem => ({
    key,
    label,
    icon,
    onClick: () => setCreateOption(option),
  });

  /** "Start with template" rows open the saved templates picker for their kind. */
  const templateRow = (key: string, kind: TemplateKind): ActionMenuItem => ({
    key,
    label: "Start with template",
    icon: <TemplateIcon size={ICON_SIZE} />,
    onClick: () => setTemplateKind(kind),
  });

  const sections: ActionMenuSection[] = [
    {
      key: "content",
      items: [
        {
          ...createRow("board", "Board", <BoardGridIcon size={ICON_SIZE} />, BOARD),
          split: true,
          submenu: [
            createRow("new-board", "New Board", <BoardGridIcon size={ICON_SIZE} />, BOARD),
            createRow("multi-level-board", "New multi-level board", <MultiLevelBoardIcon size={ICON_SIZE} />, MULTI_LEVEL_BOARD),
            templateRow("board-template", "board"),
          ],
        },
        {
          ...createRow("doc", "Doc", <FileIcon size={ICON_SIZE} />, DOC),
          split: true,
          submenu: [createRow("new-doc", "New Doc", <FileIcon size={ICON_SIZE} />, DOC), templateRow("doc-template", "doc")],
        },
        createRow("dashboard", "Dashboard", <DashboardIcon size={ICON_SIZE} />, DASHBOARD),
        {
          key: "project-management",
          label: "Project management",
          icon: <ProjectManagementIcon size={ICON_SIZE} />,
          submenu: [
            createRow("project", "Project", <FileIcon size={ICON_SIZE} />, PROJECT),
            createRow("portfolio", "Portfolio", <PortfolioIcon size={ICON_SIZE} />, PORTFOLIO),
          ],
        },
      ],
    },
    {
      key: "more",
      items: [
        createRow("folder", "Folder", <SidebarFolderIcon size={ICON_SIZE} />, FOLDER),
        {
          key: "more",
          label: "More",
          icon: <MoreDotsIcon size={ICON_SIZE} />,
          submenu_sections: [
            {
              key: "create",
              items: [
                {
                  ...createRow("form", "Form", <PencilIcon size={ICON_SIZE} />, FORM),
                  split: true,
                  submenu: [createRow("new-form", "New Form", <PencilIcon size={ICON_SIZE} />, FORM), templateRow("form-template", "form")],
                },
                createRow("canvas", "Canvas", <ImageIcon size={ICON_SIZE} />, CANVAS),
              ],
            },
            {
              key: "apps",
              items: [
                {
                  key: "installed-apps",
                  label: "Installed apps",
                  icon: <AppsGridIcon size={ICON_SIZE} />,
                  submenu: [
                    {
                      key: "manage-apps",
                      label: "Manage installed apps",
                      icon: <AppsGridIcon size={ICON_SIZE} />,
                      disabled: !can_manage_apps,
                      disabled_reason: "Only admins can manage apps",
                      onClick: () => router.push(INTEGRATIONS_HREF),
                    },
                  ],
                },
                {
                  key: "import-data",
                  label: "Import data",
                  icon: <ImportIcon size={ICON_SIZE} />,
                  submenu: [
                    createRow("import-excel", "Excel", <ImportIcon size={ICON_SIZE} />, IMPORT_EXCEL),
                    createRow("import-csv", "CSV", <ImportIcon size={ICON_SIZE} />, IMPORT_CSV),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  /** Creates the item, then opens it (folders only expand and confirm). Errors keep the dialog open. */
  const submitCreate = async ({ label, board_type }: CreateContentValues) => {
    const option = create_option;
    if (!option) return;
    const is_folder = option.payload.type === "group";
    try {
      const created_item = await nav.createItem({
        ...option.payload,
        label,
        parent_id,
        ...(is_folder ? {} : { board_type }),
      });
      if (parent_id !== null) nav.setGroupsExpanded([parent_id], true);
      if (!created_item) return;
      if (created_item.type === "group") {
        toast.success(`Created folder "${created_item.label}"`);
        return;
      }
      if (created_item.board_type === "private") toast.success(`Created private ${option.kind.noun} "${created_item.label}"`);
      const href = getLeafHref(created_item);
      router.push(option.opens_import ? `${href}?import=1` : href);
    } catch (error) {
      toast.error(apiErrorMessage(error, `We couldn't create this ${option.kind.noun}.`));
      throw error;
    }
  };

  const openCreatedFromTemplate = (board: WorkspaceNavNode) => {
    void nav.reload();
    if (parent_id !== null) nav.setGroupsExpanded([parent_id], true);
    toast.success(`Created "${board.label}" from a template`);
    router.push(getLeafHref(board));
  };

  return (
    <>
      <ActionMenu
        anchor_el={anchor_el}
        is_open={is_open}
        onClose={onClose}
        sections={sections}
        title="Add to workspace"
        aria_label="Add to workspace"
        width={256}
        submenu_width={256}
        align={align}
      />

      <CreateContentModal
        is_open={create_option !== null}
        kind={create_option?.kind ?? CREATE_CONTENT_KINDS.board}
        onSubmit={submitCreate}
        onClose={() => setCreateOption(null)}
      />

      <BoardTemplatePickerModal
        is_open={template_kind !== null}
        kind={template_kind ?? "board"}
        workspace_slug={nav.workspace_slug}
        parent_id={parent_id}
        onCreated={openCreatedFromTemplate}
        onClose={() => setTemplateKind(null)}
      />
    </>
  );
};

export default AddNewContentMenu;
