"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  all_group_ids,
  workspace_nav_tree,
  type WorkspaceTreeNode,
} from "./workspace-nav-data";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CollapseSidebarIcon,
  DeleteIcon,
  DuplicateIcon,
  ExpandSidebarIcon,
  FolderIcon,
  GroupToggleIcon,
  HomeIcon,
  MoreDotsIcon,
  MoveToIcon,
  OpenInNewTabIcon,
  PlusIcon,
  RenameIcon,
  SearchIcon,
  StarIcon,
} from "./workspace-icons";

type RowMenuState = {
  is_open: boolean;
  x: number;
  y: number;
  label: string;
};

const initialExpandedGroups = () =>
  all_group_ids.reduce<Record<string, boolean>>((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});

type TreeRowProps = {
  node: WorkspaceTreeNode;
  depth: number;
  expanded_group_ids: Record<string, boolean>;
  active_item_id: string;
  onToggleGroup: (id: string) => void;
  onSelectLeaf: (id: string, label: string) => void;
  onOpenRowMenu: (event: React.MouseEvent, label: string) => void;
};

const TreeRow: React.FC<TreeRowProps> = ({
  node,
  depth,
  expanded_group_ids,
  active_item_id,
  onToggleGroup,
  onSelectLeaf,
  onOpenRowMenu,
}) => {
  if (node.type === "group") {
    const is_expanded = expanded_group_ids[node.id];
    const padding_left = depth === 0 ? "pl-2.5" : "pl-[30px]";

    return (
      <>
        <div
          className={`group flex h-[34px] cursor-pointer items-center gap-[7px] ${padding_left} rounded-[9px] pr-2 hover:bg-white/[0.06]`}
          onClick={() => onToggleGroup(node.id)}
        >
          <span
            className="flex flex-none text-gray-400 transition-transform duration-150"
            style={{ transform: is_expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <GroupToggleIcon />
          </span>
          <span className="flex-1 truncate text-sm font-semibold text-gray-50">
            {node.label}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenRowMenu(event, node.label);
            }}
            className="ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-md text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.16] hover:text-gray-50"
            aria-label={`${node.label} options`}
          >
            <MoreDotsIcon />
          </button>
        </div>
        {is_expanded &&
          node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded_group_ids={expanded_group_ids}
              active_item_id={active_item_id}
              onToggleGroup={onToggleGroup}
              onSelectLeaf={onSelectLeaf}
              onOpenRowMenu={onOpenRowMenu}
            />
          ))}
      </>
    );
  }

  const is_group_style = node.display_style === "group";
  const is_active = active_item_id === node.id;
  const row_height = is_group_style ? "h-[34px]" : "h-9";
  const padding_left =
    depth === 0 ? (is_group_style ? "pl-2.5" : "pl-3") : depth === 1 ? "pl-[30px]" : "pl-12";

  const handleSelect = () => onSelectLeaf(node.id, node.label);
  const handleKebabClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onOpenRowMenu(event, node.label);
  };

  return (
    <div
      className={`group relative flex ${row_height} cursor-pointer items-center gap-[11px] ${padding_left} rounded-[9px] pr-2 hover:bg-white/[0.06]`}
      onClick={handleSelect}
    >
      {is_active && (
        <div className="shell-nav-item-active absolute inset-0 rounded-[9px]" />
      )}
      <span
        className={`relative z-1 flex flex-none ${is_active ? "text-white" : "text-gray-300"}`}
      >
        {is_group_style ? (
          <GroupToggleIcon />
        ) : node.id === "home" ? (
          <HomeIcon size={16} />
        ) : (
          <FolderIcon size={15} />
        )}
      </span>
      <span
        className={`relative z-1 flex-1 truncate text-sm ${is_group_style
          ? "font-semibold"
          : node.favorite
            ? "font-normal"
            : "font-normal"
          } ${is_active ? "text-white" : "text-gray-100"}`}
      >
        {node.label}
      </span>
      {node.favorite && (
        <span className="relative z-1 flex flex-none text-sunset-200">
          <StarIcon filled size={13} />
        </span>
      )}
      <button
        type="button"
        onClick={handleKebabClick}
        className="relative z-2 ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-md text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.16] hover:text-gray-50"
        aria-label={`${node.label} options`}
      >
        <MoreDotsIcon />
      </button>
    </div>
  );
};

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
    active_item_id,
    setActiveItem,
  } = useSidebar();
  const pathname = usePathname();

  // Route-driven active highlight for navigable leaves; click-driven for the
  // rest, so refreshing the page keeps the correct item highlighted.
  const route_active_id = pathname?.startsWith("/client-hub")
    ? "clienthub"
    : pathname?.startsWith("/workspace-home")
      ? "home"
      : null;
  const effective_active_id = route_active_id ?? active_item_id;

  const [expanded_group_ids, setExpandedGroupIds] = useState<Record<string, boolean>>(
    initialExpandedGroups
  );
  const [row_menu, setRowMenu] = useState<RowMenuState>({
    is_open: false,
    x: 0,
    y: 0,
    label: "",
  });

  const toggleGroup = (id: string) => {
    setExpandedGroupIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectLeaf = (id: string, label: string) => {
    setActiveItem(id, label);
  };

  const openRowMenu = (event: React.MouseEvent, label: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menu_height = 320;
    const menu_width = 214;
    let y = rect.bottom + 4;
    if (y + menu_height > window.innerHeight) {
      y = Math.max(8, rect.top - menu_height - 4);
    }
    let x = rect.right - menu_width;
    if (x < 8) x = 8;
    setRowMenu({ is_open: true, x, y, label });
  };

  const closeRowMenu = () => {
    setRowMenu((prev) => ({ ...prev, is_open: false }));
  };

  const handleCollapseClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const is_rail_collapsed = !isExpanded;
  const menu_item_class =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-gray-100 hover:bg-white/[0.08] w-full";

  return (
    <>
      {is_rail_collapsed && (
        <aside className="hidden h-full w-12 flex-none flex-col items-center border-r border-white/[0.06] bg-gray-700 pt-[22px] text-gray-300 lg:flex">
          <button
            type="button"
            onClick={toggleSidebar}
            className="shell-icon-button h-[30px] w-[30px]"
            aria-label="Expand sidebar"
          >
            <ExpandSidebarIcon />
          </button>
        </aside>
      )}

      <aside
        className={`shell-scrollbar fixed bottom-0 left-0 top-[52px] z-50 flex h-[calc(100vh-52px)] w-80 flex-none flex-col overflow-y-auto border-r border-white/[0.06] bg-gray-700 text-gray-200 transition-transform duration-300 ease-in-out lg:h-full ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${is_rail_collapsed ? "lg:hidden" : "lg:static lg:flex lg:translate-x-0"}`}
      >
        <div className="sticky top-0 z-[5] flex flex-none flex-col gap-3.5 bg-gray-700 px-4 pb-2.5 pt-5">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold tracking-[-0.01em] text-gray-50">
              Workspace
            </span>
            <div className="flex items-center gap-1.5 text-gray-400">
              <button type="button" className="shell-icon-button h-7 w-7" aria-label="Workspace options">
                <MoreDotsIcon size={16} />
              </button>
              <button type="button" className="shell-icon-button h-7 w-7" aria-label="Search">
                <SearchIcon />
              </button>
              <button
                type="button"
                onClick={handleCollapseClick}
                className="shell-icon-button h-7 w-7"
                aria-label="Collapse sidebar"
              >
                <CollapseSidebarIcon />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-[10px] border border-white/10 bg-gray-800 px-3 py-2.5 transition-colors hover:border-brand-500/60">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-brand-500 font-outfit text-xs font-bold text-white">
                97
              </span>
              <span className="flex-1 text-sm font-semibold text-gray-50">Fulfillment</span>
              <ChevronDownIcon size={12} className="flex-none text-gray-400" />
            </div>
            <button
              type="button"
              className="flex w-[42px] flex-none items-center justify-center rounded-[10px] border border-white/10 bg-gray-800 text-gray-100 transition-colors hover:border-brand-500/60"
              aria-label="New workspace item"
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col px-2.5 pb-7 pt-1.5">
          <div className="flex cursor-pointer items-center gap-1.5 px-2.5 pb-1 pt-2.5 text-xs font-semibold tracking-[0.04em] text-gray-400">
            My workspace agents
            <ChevronRightIcon />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-2 text-xs font-semibold tracking-[0.04em] text-gray-400">
            Content
            <span className="rotate-90">
              <GroupToggleIcon />
            </span>
          </div>

          {workspace_nav_tree.map((node) =>
            node.type === "leaf" && node.href ? (
              <Link key={node.id} href={node.href} className="contents">
                <TreeRow
                  node={node}
                  depth={0}
                  expanded_group_ids={expanded_group_ids}
                  active_item_id={effective_active_id}
                  onToggleGroup={toggleGroup}
                  onSelectLeaf={selectLeaf}
                  onOpenRowMenu={openRowMenu}
                />
              </Link>
            ) : (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                expanded_group_ids={expanded_group_ids}
                active_item_id={effective_active_id}
                onToggleGroup={toggleGroup}
                onSelectLeaf={selectLeaf}
                onOpenRowMenu={openRowMenu}
              />
            )
          )}
        </nav>
      </aside>

      {row_menu.is_open && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={closeRowMenu} />
          <div
            className="fixed z-[1000] w-[214px] rounded-xl border border-white/10 bg-[#0F1C1C] p-1.5 shadow-2xl"
            style={{ left: row_menu.x, top: row_menu.y }}
          >
            <div className="mb-1 truncate border-b border-white/[0.07] px-2.5 pb-2 pt-1.5 font-mono-accent text-[11px] tracking-[0.05em] text-gray-400">
              {row_menu.label}
            </div>
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-gray-400">
                <OpenInNewTabIcon />
              </span>
              Open in new tab
            </DropdownItem>
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-gray-400">
                <RenameIcon />
              </span>
              Rename
            </DropdownItem>
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-gray-400">
                <MoveToIcon />
              </span>
              Move to
            </DropdownItem>
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-sunset-200">
                <StarIcon />
              </span>
              Add to favorites
            </DropdownItem>
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-gray-400">
                <DuplicateIcon />
              </span>
              Duplicate
            </DropdownItem>
            <div className="my-1 h-px bg-white/[0.08]" />
            <DropdownItem tag="button" baseClassName="" onItemClick={closeRowMenu} className={menu_item_class}>
              <span className="flex w-4 flex-none text-gray-400">
                <ArchiveIcon />
              </span>
              Archive
            </DropdownItem>
            <DropdownItem
              tag="button"
              baseClassName=""
              onItemClick={closeRowMenu}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-brand-200 hover:bg-brand-500/[0.14]"
            >
              <span className="flex w-4 flex-none text-brand-200">
                <DeleteIcon />
              </span>
              Delete
            </DropdownItem>
          </div>
        </>
      )}
    </>
  );
};

export default AppSidebar;
