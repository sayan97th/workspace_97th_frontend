"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import NavItemFormModal from "./NavItemFormModal";
import { getLeafHref } from "./helpers";
import type { CreateNavItemPayload } from "@/types/workspace";
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

/** What one create row makes, collected by the name dialog before it reaches the API. */
type CreateOption = {
  dialog_title: string;
  placeholder: string;
  payload: Omit<CreateNavItemPayload, "label" | "parent_id">;
  /** Opens the board's import wizard once it exists ("Import data" rows). */
  opens_import?: boolean;
};

type FormState = { is_open: boolean; option: CreateOption | null };

const CLOSED_FORM: FormState = { is_open: false, option: null };

/** Same floor as the Administration page, where installed apps are managed. */
const APP_ADMIN_ROLES = ["super_admin", "admin", "staff"];
const INTEGRATIONS_HREF = "/administration?section=integrations";
const ICON_SIZE = 16;

const BOARD: CreateOption = { dialog_title: "New Board", placeholder: "Board name", payload: { type: "leaf", view_key: "board" } };
const DOC: CreateOption = { dialog_title: "New Doc", placeholder: "Doc name", payload: { type: "leaf", view_key: "doc" } };
const FORM: CreateOption = { dialog_title: "New Form", placeholder: "Form name", payload: { type: "leaf", view_key: "form" } };

/**
 * The sidebar's "Add to workspace" menu, laid out like monday.com's: content
 * types first (Board and Doc are split rows, a click creates, the chevron
 * shows their variants), then Folder and More. Every create
 * row asks for a name in {@link NavItemFormModal}, creates the item through
 * {@link WorkspaceNavApi.createItem} and opens it. Opened from the "+" next
 * to the workspace switcher and from the "+" in the Content header.
 */
const AddNewContentMenu: React.FC<AddNewContentMenuProps> = ({ anchor_el, is_open, onClose, nav, parent_id = null, align = "start" }) => {
  const router = useRouter();
  const toast = useToast();
  const { hasAnyRole } = useAuth();
  const [form, setForm] = useState<FormState>(CLOSED_FORM);

  const can_manage_apps = hasAnyRole(...APP_ADMIN_ROLES);

  const createRow = (key: string, label: string, icon: React.ReactNode, option: CreateOption): ActionMenuItem => ({
    key,
    label,
    icon,
    onClick: () => setForm({ is_open: true, option }),
  });

  const withStyle = (option: CreateOption, display_style: string): CreateOption => ({
    ...option,
    payload: { ...option.payload, display_style },
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
            createRow("multi-level-board", "New multi-level board", <MultiLevelBoardIcon size={ICON_SIZE} />, {
              ...withStyle(BOARD, "multi_level"),
              dialog_title: "New multi-level board",
            }),
            createRow("board-template", "Start with template", <TemplateIcon size={ICON_SIZE} />, withStyle(BOARD, "template")),
          ],
        },
        {
          ...createRow("doc", "Doc", <FileIcon size={ICON_SIZE} />, DOC),
          split: true,
          submenu: [
            createRow("new-doc", "New Doc", <FileIcon size={ICON_SIZE} />, DOC),
            createRow("doc-template", "Start with template", <TemplateIcon size={ICON_SIZE} />, withStyle(DOC, "template")),
          ],
        },
        createRow("dashboard", "Dashboard", <DashboardIcon size={ICON_SIZE} />, {
          dialog_title: "New Dashboard",
          placeholder: "Dashboard name",
          payload: { type: "leaf", view_key: "dashboard" },
        }),
        {
          key: "project-management",
          label: "Project management",
          icon: <ProjectManagementIcon size={ICON_SIZE} />,
          submenu: [
            createRow("project", "Project", <FileIcon size={ICON_SIZE} />, {
              dialog_title: "New Project",
              placeholder: "Project name",
              payload: { type: "leaf", view_key: "project" },
            }),
            createRow("portfolio", "Portfolio", <PortfolioIcon size={ICON_SIZE} />, {
              dialog_title: "New Portfolio",
              placeholder: "Portfolio name",
              payload: { type: "leaf", view_key: "portfolio" },
            }),
          ],
        },
      ],
    },
    {
      key: "more",
      items: [
        createRow("folder", "Folder", <SidebarFolderIcon size={ICON_SIZE} />, {
          dialog_title: "New folder",
          placeholder: "Folder name",
          payload: { type: "group" },
        }),
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
                  submenu: [
                    createRow("new-form", "New Form", <PencilIcon size={ICON_SIZE} />, FORM),
                    createRow("form-template", "Start with template", <TemplateIcon size={ICON_SIZE} />, withStyle(FORM, "template")),
                  ],
                },
                createRow("canvas", "Canvas", <ImageIcon size={ICON_SIZE} />, {
                  dialog_title: "New Canvas",
                  placeholder: "Canvas name",
                  payload: { type: "leaf", view_key: "canvas" },
                }),
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
                    createRow("import-excel", "Excel", <ImportIcon size={ICON_SIZE} />, { ...BOARD, dialog_title: "Import from Excel", opens_import: true }),
                    createRow("import-csv", "CSV", <ImportIcon size={ICON_SIZE} />, { ...BOARD, dialog_title: "Import from CSV", opens_import: true }),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const submitForm = async (label: string) => {
    const option = form.option;
    if (!option) return;
    const created_item = await nav.createItem({ ...option.payload, label, parent_id });
    if (parent_id !== null) nav.setGroupsExpanded([parent_id], true);
    if (!created_item) return;
    if (created_item.type === "group") {
      toast.success(`Created folder "${created_item.label}"`);
      return;
    }
    const href = getLeafHref(created_item);
    router.push(option.opens_import ? `${href}?import=1` : href);
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

      <NavItemFormModal
        is_open={form.is_open}
        title={form.option?.dialog_title ?? ""}
        submit_label="Create"
        placeholder={form.option?.placeholder}
        onSubmit={(label) =>
          submitForm(label).catch((error) => {
            toast.error(apiErrorMessage(error, "We couldn't create this item."));
          })
        }
        onClose={() => setForm(CLOSED_FORM)}
      />
    </>
  );
};

export default AddNewContentMenu;
