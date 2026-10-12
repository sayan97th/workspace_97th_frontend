"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarPlus,
  Clock,
  Copy,
  Download,
  FileText,
  Link2,
  ListTree,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Printer,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import BoardInviteModal from "@/components/board/BoardInviteModal";
import PresenceAvatarStack from "@/components/board/PresenceAvatarStack";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import type { WorkspaceViewProps } from "@/components/workspace-nav/TableBoardView";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildPageTitle } from "@/lib/page-title";
import { boardDocService } from "@/services/board-doc.service";
import { boardInvitationService } from "@/services/board-invitation.service";
import { boardOptionsService } from "@/services/board-options.service";
import { personalService } from "@/services/personal.service";
import { notifyNavItemChanged, workspaceService } from "@/services/workspace.service";
import type { BoardDocDto } from "@/types/board-doc";
import type { BoardAccessEntry } from "@/types/board-invitation";
import { DocEditorProvider, DocEditorSurface, DocOutline, DocToolbar, useDocEditor, type DocMember } from "./editor";
import DocSaveIndicator from "./DocSaveIndicator";
import { downloadMarkdown, printDoc } from "./doc-export";
import { useDocAutosave, type DocSaveStatus } from "./useDocAutosave";

const FULL_WIDTH_STORAGE_KEY = "doc-page:full-width";
const OUTLINE_STORAGE_KEY = "doc-page:outline-open";
const ICON_SIZE = 16;

const readFlag = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeFlag = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Only a per viewer convenience, nothing to do when storage is blocked.
  }
};

/** "Oct 12, 2026, 14:30", the way monday's doc header shows dates. */
const formatDocDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
};

/**
 * A Doc (a navigation leaf with `view_key = doc`): a Notion style document
 * page with monday's doc look. The toolbar runs across the top, the page
 * column holds the title (renamed in place), the favorite star, the
 * creator/created/updated row and the editor. The body autosaves to
 * `/api/boards/{id}/doc`.
 */
const DocPageView: React.FC<WorkspaceViewProps> = ({ node }) => {
  const toast = useToast();
  const [doc, setDoc] = useState<BoardDocDto | null>(null);
  const [has_error, setHasError] = useState(false);
  const [members, setMembers] = useState<DocMember[]>([]);
  const [access, setAccess] = useState<BoardAccessEntry[]>([]);
  const [label, setLabel] = useState(node.label);

  const can_edit = node.can_edit && (node.permission_level === "full" || node.permission_level === "content");

  useDocumentTitle(buildPageTitle(label));

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setHasError(false);
    boardDocService
      .getDoc(node.id)
      .then((data) => {
        if (!cancelled) setDoc(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [node.id]);

  // Mentions and Share are extras, the doc still opens when either fails.
  useEffect(() => {
    let cancelled = false;
    workspaceService
      .getWorkspaceMembers(node.workspace.slug)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch(() => undefined);
    boardInvitationService
      .listAccess(node.id)
      .then((data) => {
        if (!cancelled) setAccess(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [node.id, node.workspace.slug]);

  const { status, queueSave, flushSave } = useDocAutosave((content) =>
    boardDocService.saveDoc(node.id, content).then((saved) => setDoc(saved))
  );

  const handleRename = async (next_label: string) => {
    const previous = label;
    setLabel(next_label);
    try {
      await workspaceService.updateNavItem(node.workspace.slug, node.id, { label: next_label });
      notifyNavItemChanged();
    } catch {
      setLabel(previous);
      toast.error("We couldn't rename this doc.");
    }
  };

  if (has_error) {
    return <CenteredMessage title="Something went wrong" detail="We couldn't load this doc. Please try again." />;
  }

  if (!doc) return <BoardLoadingSpinner />;

  return (
    <div className="doc-theme flex h-full min-w-0 flex-col overflow-hidden bg-[var(--doc-page)]">
      <DocEditorProvider
        key={node.id}
        initial_content={doc.content}
        onChange={queueSave}
        onBlur={flushSave}
        editable={can_edit}
        members={members}
        onUploadFile={(file) => boardDocService.uploadFile(node.id, file)}
      >
        <DocPageBody
          node={node}
          doc={doc}
          label={label}
          can_edit={can_edit}
          access={access}
          onAccessChange={setAccess}
          onRename={handleRename}
          save_status={status}
          onRetrySave={flushSave}
        />
      </DocEditorProvider>
    </div>
  );
};

export default DocPageView;

type DocPageBodyProps = {
  node: WorkspaceViewProps["node"];
  doc: BoardDocDto;
  label: string;
  can_edit: boolean;
  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;
  onRename: (label: string) => Promise<void>;
  save_status: DocSaveStatus;
  onRetrySave: () => void;
};

/** Everything inside the editor provider, so the actions can reach the editor (export, print). */
const DocPageBody: React.FC<DocPageBodyProps> = ({ node, doc, label, can_edit, access, onAccessChange, onRename, save_status, onRetrySave }) => {
  const router = useRouter();
  const toast = useToast();
  const { editor } = useDocEditor();
  const more_ref = useRef<HTMLButtonElement>(null);
  const [is_more_open, setIsMoreOpen] = useState(false);
  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [is_delete_open, setIsDeleteOpen] = useState(false);
  const [is_favorite, setIsFavorite] = useState(node.is_favorite);
  const [is_full_width, setIsFullWidth] = useState(false);
  const [is_outline_open, setIsOutlineOpen] = useState(false);

  useEffect(() => {
    setIsFullWidth(readFlag(FULL_WIDTH_STORAGE_KEY));
    setIsOutlineOpen(readFlag(OUTLINE_STORAGE_KEY));
  }, []);

  const toggleFullWidth = () => {
    setIsFullWidth((current) => {
      writeFlag(FULL_WIDTH_STORAGE_KEY, !current);
      return !current;
    });
  };

  const toggleOutline = () => {
    setIsOutlineOpen((current) => {
      writeFlag(OUTLINE_STORAGE_KEY, !current);
      return !current;
    });
  };

  const toggleFavorite = async () => {
    const next_value = !is_favorite;
    setIsFavorite(next_value);
    try {
      await personalService.setFavorite(node.id, next_value);
    } catch {
      setIsFavorite(!next_value);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("We couldn't copy the link.");
    }
  };

  const runMenuAction = (action: () => void | Promise<void>) => () => {
    setIsMoreOpen(false);
    void action();
  };

  const more_sections: ActionMenuSection[] = [
    {
      key: "view",
      items: [
        { key: "outline", label: is_outline_open ? "Hide outline" : "Show outline", icon: <ListTree size={ICON_SIZE} />, onClick: runMenuAction(toggleOutline) },
        {
          key: "full-width",
          label: is_full_width ? "Default width" : "Full width",
          icon: is_full_width ? <Minimize2 size={ICON_SIZE} /> : <Maximize2 size={ICON_SIZE} />,
          onClick: runMenuAction(toggleFullWidth),
        },
      ],
    },
    {
      key: "share",
      items: [
        { key: "copy-link", label: "Copy link", icon: <Link2 size={ICON_SIZE} />, onClick: runMenuAction(copyLink) },
        {
          key: "export-markdown",
          label: "Export as Markdown",
          icon: <Download size={ICON_SIZE} />,
          onClick: runMenuAction(() => {
            if (editor) downloadMarkdown(label, editor.getMarkdown());
          }),
        },
        {
          key: "print",
          label: "Print or save as PDF",
          icon: <Printer size={ICON_SIZE} />,
          onClick: runMenuAction(() => {
            if (editor) printDoc(label, editor.getHTML());
          }),
        },
      ],
    },
    {
      key: "manage",
      items: [
        {
          key: "duplicate",
          label: "Duplicate",
          icon: <Copy size={ICON_SIZE} />,
          disabled: !node.can_manage,
          disabled_reason: "Only the doc's owners can duplicate it",
          onClick: runMenuAction(async () => {
            try {
              const copy = await workspaceService.duplicateNavItem(node.workspace.slug, node.id);
              notifyNavItemChanged();
              router.push(`/boards/${copy.id}`);
            } catch {
              toast.error("We couldn't duplicate this doc.");
            }
          }),
        },
        {
          key: "archive",
          label: "Archive",
          icon: <Archive size={ICON_SIZE} />,
          disabled: !node.can_manage,
          disabled_reason: "Only the doc's owners can archive it",
          onClick: runMenuAction(async () => {
            try {
              await boardOptionsService.archiveBoard(node.id);
              notifyNavItemChanged();
              toast.success(`Archived "${label}"`);
              router.push("/workspace-home");
            } catch {
              toast.error("We couldn't archive this doc.");
            }
          }),
        },
        {
          key: "delete",
          label: "Delete",
          icon: <Trash2 size={ICON_SIZE} />,
          danger: true,
          disabled: !node.can_manage,
          disabled_reason: "Only the doc's owners can delete it",
          onClick: runMenuAction(() => setIsDeleteOpen(true)),
        },
      ],
    },
  ];

  const trailing = (
    <>
      <DocSaveIndicator status={save_status} onRetry={onRetrySave} />
      <PresenceAvatarStack board_id={node.id} />
      <div className="flex items-center rounded border border-[var(--doc-border-strong)]">
        <button type="button" className="doc-button rounded-r-none" onClick={() => setIsInviteOpen(true)}>
          <UserPlus size={ICON_SIZE} />
          Share
        </button>
        <span className="h-5 w-px bg-[var(--doc-border-strong)]" aria-hidden="true" />
        <button type="button" className="doc-icon-button rounded-l-none" aria-label="Copy link" title="Copy link" onClick={() => void copyLink()}>
          <Link2 size={ICON_SIZE} />
        </button>
      </div>
      <button
        ref={more_ref}
        type="button"
        className={`doc-icon-button${is_more_open ? " is-active" : ""}`}
        aria-label="More actions"
        title="More actions"
        onClick={() => setIsMoreOpen((current) => !current)}
      >
        <MoreHorizontal size={18} />
      </button>
    </>
  );

  return (
    <>
      <DocToolbar trailing={trailing} />

      <div className="flex min-h-0 flex-1">
        <aside className={`doc-print-hidden flex flex-none flex-col items-start pt-6 pl-4 ${is_outline_open ? "border-r border-[var(--doc-border)]" : ""}`}>
          <button
            type="button"
            className={`doc-icon-button${is_outline_open ? " is-active" : ""}`}
            aria-label={is_outline_open ? "Hide outline" : "Show outline"}
            title={is_outline_open ? "Hide outline" : "Show outline"}
            aria-pressed={is_outline_open}
            onClick={toggleOutline}
          >
            <ListTree size={18} />
          </button>
          {is_outline_open && <DocOutline />}
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className={`mx-auto w-full px-6 pt-10 sm:px-16 ${is_full_width ? "max-w-none" : "max-w-[860px]"}`}>
            <div className="flex items-center gap-3">
              <FileText size={22} className="flex-none text-[var(--doc-text-secondary)]" aria-hidden="true" />
              <DocTitle
                label={label}
                editable={can_edit}
                onRename={onRename}
                onEnter={() => editor?.commands.focus("start")}
              />
              <button
                type="button"
                className={`doc-icon-button flex-none${is_favorite ? " text-[#ffcb00]" : ""}`}
                aria-label={is_favorite ? "Remove from favorites" : "Add to favorites"}
                title={is_favorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={is_favorite}
                onClick={() => void toggleFavorite()}
              >
                <Star size={20} fill={is_favorite ? "#ffcb00" : "none"} stroke={is_favorite ? "#ffcb00" : "currentColor"} />
              </button>
            </div>

            <div className="mt-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[var(--doc-text-secondary)]">
              <span className="flex items-center gap-2">
                <UserAvatar user={node.creator} size={22} font_size={9} />
                Creator <span className="font-semibold text-[var(--doc-text)]">{node.creator?.full_name ?? "Unknown"}</span>
              </span>
              <span className="flex items-center gap-2">
                <CalendarPlus size={16} aria-hidden="true" />
                Created <span className="font-semibold text-[var(--doc-text)]">{formatDocDate(node.created_at)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} aria-hidden="true" />
                Last updated <span className="font-semibold text-[var(--doc-text)]">{formatDocDate(doc.updated_at ?? node.created_at)}</span>
              </span>
            </div>

            <DocEditorSurface />
          </div>
        </div>
      </div>

      <ActionMenu
        anchor_el={more_ref.current}
        is_open={is_more_open}
        onClose={() => setIsMoreOpen(false)}
        sections={more_sections}
        aria_label="Doc actions"
        width={240}
        align="end"
      />
      <BoardInviteModal
        is_open={is_invite_open}
        onClose={() => setIsInviteOpen(false)}
        board_id={node.id}
        board_label={label}
        board_type={node.board_type}
        workspace_name={node.workspace.name}
        initial_access={access}
        onAccessChange={onAccessChange}
      />
      <ConfirmActionModal
        is_open={is_delete_open}
        title="Delete this doc?"
        description={`"${label}" will be moved to the trash.`}
        confirm_label="Delete"
        variant="danger"
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async () => {
          await workspaceService.deleteNavItem(node.workspace.slug, node.id);
          notifyNavItemChanged();
          router.push("/workspace-home");
        }}
      />
    </>
  );
};

type DocTitleProps = {
  label: string;
  editable: boolean;
  onRename: (label: string) => Promise<void>;
  /** Enter leaves the title and moves the caret into the doc, like Notion. */
  onEnter: () => void;
};

/** The doc's big title, renamed in place. Escape reverts, an empty title keeps the old name. */
const DocTitle: React.FC<DocTitleProps> = ({ label, editable, onRename, onEnter }) => {
  const title_ref = useRef<HTMLHeadingElement>(null);

  // The heading's text lives in the DOM (React renders no children into it, so typing never
  // conflicts with a render). Outside renames are written back only while it isn't focused.
  useLayoutEffect(() => {
    const element = title_ref.current;
    if (element && document.activeElement !== element) element.textContent = label;
  }, [label]);

  const commit = () => {
    const element = title_ref.current;
    if (!element) return;
    const next_label = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!next_label) {
      element.textContent = label;
      return;
    }
    if (next_label !== label) void onRename(next_label);
  };

  return (
    <h1
      ref={title_ref}
      contentEditable={editable ? "plaintext-only" : false}
      spellCheck={false}
      role={editable ? "textbox" : undefined}
      aria-label="Doc title"
      className="min-w-0 rounded px-1 font-[family-name:var(--doc-font-heading)] text-[32px] leading-tight font-bold break-words text-[var(--doc-text)] outline-none hover:bg-[var(--doc-hover-soft)] focus:bg-transparent"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          title_ref.current?.blur();
          onEnter();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          if (title_ref.current) title_ref.current.textContent = label;
          title_ref.current?.blur();
        }
      }}
    />
  );
};
