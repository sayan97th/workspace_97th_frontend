"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Download,
  Link2,
  ListTree,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Presentation,
  Printer,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useBoardDiscussionDrawer } from "@/components/board/drawer";
import PresenceAvatarStack from "@/components/board/PresenceAvatarStack";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import type { WorkspaceViewProps } from "@/components/workspace-nav/TableBoardView";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getUserInitials } from "@/lib/user";
import { buildPageTitle } from "@/lib/page-title";
import { boardDocService } from "@/services/board-doc.service";
import { boardInvitationService } from "@/services/board-invitation.service";
import { boardOptionsService } from "@/services/board-options.service";
import { personalService } from "@/services/personal.service";
import { notifyNavItemChanged, workspaceService } from "@/services/workspace.service";
import type { BoardDocDto, BoardDocPublicLink } from "@/types/board-doc";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardEditPermission, WorkspaceMember } from "@/types/workspace";
import { DocEditorProvider, DocEditorSurface, DocOutline, DocToolbar, useDocEditor } from "./editor";
import { serializeDocContent } from "./editor/doc-content";
import DocCommentsPanel from "./comments/DocCommentsPanel";
import { DocMetaRow, DocTitle, DocTypeIcon } from "./DocHeaderParts";
import DocPresentationMode from "./presentation/DocPresentationMode";
import DocSaveIndicator from "./DocSaveIndicator";
import DocShareModal from "./share/DocShareModal";
import { downloadMarkdown, printDoc } from "./doc-export";
import { useDocAutosave, type DocSaveStatus } from "./useDocAutosave";
import { DOC_FULL_WIDTH_STORAGE_KEY, DOC_OUTLINE_STORAGE_KEY, readDocFlag, writeDocFlag } from "./doc-view-flags";

const ICON_SIZE = 16;

/**
 * A Doc (a navigation leaf with `view_key = doc`): a Notion style document
 * page with monday's doc look. The toolbar runs across the top, the page
 * column holds the title (renamed in place), the favorite star, the
 * creator/created/updated row and the editor. The body autosaves to
 * `/api/boards/{id}/doc`. The toolbar's right side opens the Comments panel,
 * the Presentation mode and the "Invite to this doc" Share dialog.
 */
const DocPageView: React.FC<WorkspaceViewProps> = ({ node }) => {
  const toast = useToast();
  const [doc, setDoc] = useState<BoardDocDto | null>(null);
  const [has_error, setHasError] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
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
          onDocChange={setDoc}
          label={label}
          can_edit={can_edit}
          members={members}
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
  onDocChange: (doc: BoardDocDto) => void;
  label: string;
  can_edit: boolean;
  members: WorkspaceMember[];
  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;
  onRename: (label: string) => Promise<void>;
  save_status: DocSaveStatus;
  onRetrySave: () => void;
};

/** Everything inside the editor provider, so the actions can reach the editor (export, print, presentation). */
const DocPageBody: React.FC<DocPageBodyProps> = ({
  node,
  doc,
  onDocChange,
  label,
  can_edit,
  members,
  access,
  onAccessChange,
  onRename,
  save_status,
  onRetrySave,
}) => {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { branding } = useBranding();
  const { editor } = useDocEditor();
  const [edit_permission, setEditPermission] = useState<BoardEditPermission>(node.edit_permission);
  const [presentation_content, setPresentationContent] = useState<string | null>(null);
  const [is_presenting, setIsPresenting] = useState(false);

  const current_user: BoardPersonOption = useMemo(
    () =>
      user
        ? { id: String(user.id), name: user.full_name, initials: getUserInitials(user), avatar_seed: 0, avatar_url: user.profile_photo_url ?? undefined }
        : { id: "0", name: "You", initials: "Y", avatar_seed: 0 },
    [user]
  );
  const mentionable_people: BoardPersonOption[] = useMemo(
    () =>
      members.map((member, index) => ({
        id: String(member.id),
        name: member.full_name,
        initials: getUserInitials(member),
        avatar_seed: index,
        avatar_url: member.profile_photo_url ?? undefined,
        is_deactivated: member.is_deactivated,
      })),
    [members]
  );

  // The doc's comments are its navigation item's own discussion thread.
  const comments = useBoardDiscussionDrawer({
    board_id: node.id,
    current_user,
    mentionable_people,
    breadcrumb_label: `${node.workspace.name} · ${label}`,
    initial_comment_count: node.comments_count,
    initial_has_unseen_comments: node.has_unseen_comments,
    can_edit: node.can_edit,
  });

  const startPresentation = () => {
    setPresentationContent(editor ? serializeDocContent(editor.getJSON()) : doc.content);
    setIsPresenting(true);
  };
  const more_ref = useRef<HTMLButtonElement>(null);
  const [is_more_open, setIsMoreOpen] = useState(false);
  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [is_delete_open, setIsDeleteOpen] = useState(false);
  const [is_favorite, setIsFavorite] = useState(node.is_favorite);
  const [is_full_width, setIsFullWidth] = useState(false);
  const [is_outline_open, setIsOutlineOpen] = useState(false);

  useEffect(() => {
    setIsFullWidth(readDocFlag(DOC_FULL_WIDTH_STORAGE_KEY));
    setIsOutlineOpen(readDocFlag(DOC_OUTLINE_STORAGE_KEY));
  }, []);

  const toggleFullWidth = () => {
    setIsFullWidth((current) => {
      writeDocFlag(DOC_FULL_WIDTH_STORAGE_KEY, !current);
      return !current;
    });
  };

  const toggleOutline = () => {
    setIsOutlineOpen((current) => {
      writeDocFlag(DOC_OUTLINE_STORAGE_KEY, !current);
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
        { key: "present", label: "Present", icon: <Presentation size={ICON_SIZE} />, onClick: runMenuAction(startPresentation) },
        {
          key: "comments",
          label: comments.is_open ? "Hide comments" : "Show comments",
          icon: <MessageCircle size={ICON_SIZE} />,
          onClick: runMenuAction(comments.is_open ? comments.close : comments.open),
        },
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
      <button
        type="button"
        className={`doc-icon-button doc-comments-toggle${comments.is_open ? " is-active" : ""}`}
        aria-label="Comments"
        title="Comments"
        aria-pressed={comments.is_open}
        onClick={comments.is_open ? comments.close : comments.open}
      >
        <MessageCircle size={18} />
        {comments.comment_count > 0 && (
          <span className={`doc-comments-count${comments.has_unseen_comments ? " is-unseen" : ""}`}>
            {comments.comment_count > 99 ? "99+" : comments.comment_count}
          </span>
        )}
      </button>
      <button type="button" className="doc-icon-button" aria-label="Presentation" title="Presentation" onClick={startPresentation}>
        <Presentation size={18} />
      </button>
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

      <div className="relative flex min-h-0 flex-1">
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
              <DocTypeIcon board_type={node.board_type} />
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

            <DocMetaRow creator={node.creator} created_at={node.created_at} updated_at={doc.updated_at} className="mt-4 mb-8" />

            <DocEditorSurface />
          </div>
        </div>

        <DocCommentsPanel drawer={comments} />
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
      <DocShareModal
        is_open={is_invite_open}
        onClose={() => setIsInviteOpen(false)}
        board_id={node.id}
        board_type={node.board_type}
        workspace_name={node.workspace.name}
        company_name={branding.company_name}
        can_manage={node.can_manage}
        members={members}
        access={access}
        onAccessChange={onAccessChange}
        edit_permission={edit_permission}
        onEditPermissionChange={setEditPermission}
        public_link={doc.public_link ?? { is_enabled: false, token: null }}
        onPublicLinkChange={(public_link: BoardDocPublicLink) => onDocChange({ ...doc, public_link })}
      />
      <DocPresentationMode
        is_open={is_presenting}
        onClose={() => setIsPresenting(false)}
        content={presentation_content}
        heading={
          <>
            <div className="doc-presentation-title-row">
              <DocTypeIcon board_type={node.board_type} size={26} />
              <h1 className="doc-presentation-title">{label}</h1>
              <button
                type="button"
                className={`doc-icon-button flex-none${is_favorite ? " text-[#ffcb00]" : ""}`}
                aria-label={is_favorite ? "Remove from favorites" : "Add to favorites"}
                title={is_favorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={is_favorite}
                onClick={() => void toggleFavorite()}
              >
                <Star size={22} fill={is_favorite ? "#ffcb00" : "none"} stroke={is_favorite ? "#ffcb00" : "currentColor"} />
              </button>
            </div>
            <DocMetaRow creator={node.creator} created_at={node.created_at} updated_at={doc.updated_at} className="mt-4 mb-10" />
          </>
        }
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
