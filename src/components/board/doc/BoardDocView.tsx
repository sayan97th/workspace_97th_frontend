"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronsDown,
  ChevronsUp,
  Download,
  Link2,
  ListTree,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Presentation,
  Printer,
  UserPlus,
} from "lucide-react";
import PresenceAvatarStack from "@/components/board/PresenceAvatarStack";
import type { BoardDiscussionDrawerApi } from "@/components/board/drawer/useBoardDiscussionDrawer";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useToast } from "@/components/ui/toast/ToastProvider";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { useBranding } from "@/context/BrandingContext";
import { boardShareService, buildSharedViewUrl } from "@/services/board-share.service";
import type { BoardViewDto } from "@/types/board-content";
import type { BoardViewShareLinkDto } from "@/types/board-sharing";
import { DocEditorProvider, DocEditorSurface, DocOutline, DocToolbar, useDocEditor, type DocMember, type DocUploadHandler } from "./editor";
import { serializeDocContent } from "./editor/doc-content";
import DocCommentsPanel from "./comments/DocCommentsPanel";
import { DocMetaRow, DocTitle } from "./DocHeaderParts";
import DocPresentationMode from "./presentation/DocPresentationMode";
import DocSaveIndicator from "./DocSaveIndicator";
import DocShareModal, { type DocShareModalProps } from "./share/DocShareModal";
import { downloadMarkdown, printDoc } from "./doc-export";
import { DOC_FULL_WIDTH_STORAGE_KEY, DOC_OUTLINE_STORAGE_KEY, readDocFlag, writeDocFlag } from "./doc-view-flags";
import { useDocAutosave, type DocSaveStatus } from "./useDocAutosave";

const ICON_SIZE = 16;

/** What the tab's Share dialog needs from the board: its access roster and edit rights. */
export type BoardDocShareConfig = Pick<
  DocShareModalProps,
  "board_type" | "workspace_name" | "can_manage" | "members" | "access" | "onAccessChange" | "edit_permission" | "onEditPermissionChange"
>;

export type BoardDocViewProps = {
  view: BoardViewDto;
  /** The board, for presence, the Share dialog and the tab's public link. */
  board_id: number;
  /** Persists the doc body (editor JSON), called by the debounced autosave. */
  onSaveDocContent: (doc_content: string) => Promise<void>;
  /** Renames the tab from the doc's big title. Omit to show the title read only. */
  onRenameView?: (label: string) => Promise<void>;
  /** Uploads images, videos and files embedded in the doc. Omit to only allow images, inlined as data URLs. */
  onUploadFile?: DocUploadHandler;
  /** People offered by "@" mentions. */
  members?: DocMember[];
  /** False renders the doc read only. */
  editable?: boolean;
  /** The board's discussion, shown as the doc's inline Comments panel. Omit to hide Comments. */
  comments?: BoardDiscussionDrawerApi;
  /** Enables the Share button. Omit to hide it. */
  share?: BoardDocShareConfig;
  /** Whether the board title row above the tabs is hidden. */
  is_header_collapsed?: boolean;
  /** Shows the "Collapse header" toggle at the end of the toolbar. */
  onToggleHeaderCollapsed?: () => void;
};

/**
 * The "Doc" board tab, laid out like monday's: the doc toolbar runs edge to
 * edge under the view tabs, the outline toggle sits on the left and the page
 * column holds the tab's name as a big title (renamed in place), the
 * creator/created/updated row and the same Notion style editor as a
 * standalone Doc (`DocPageView`). The toolbar ends with presence, Comments
 * (the board's discussion, inline on the right), Presentation, Share (with
 * the tab's public "Share view" link), the "..." menu and a "Collapse
 * header" toggle. The body is stored in the view's `doc_content`; tabs
 * written by the previous markdown editor still load and are saved as editor
 * JSON from their next edit on.
 */
const BoardDocView: React.FC<BoardDocViewProps> = ({ view, onSaveDocContent, onUploadFile, members = [], editable = true, ...rest }) => {
  const [updated_at, setUpdatedAt] = useState(view.updated_at);
  const { status, queueSave, flushSave } = useDocAutosave((content) =>
    onSaveDocContent(content).then(() => setUpdatedAt(new Date().toISOString()))
  );

  useEffect(() => {
    setUpdatedAt(view.updated_at);
  }, [view.id, view.updated_at]);

  return (
    <div className="doc-theme flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--doc-page)]">
      <DocEditorProvider
        key={view.id}
        initial_content={view.doc_content}
        onChange={queueSave}
        onBlur={flushSave}
        editable={editable}
        members={members}
        onUploadFile={onUploadFile}
      >
        <BoardDocBody view={view} updated_at={updated_at} save_status={status} onRetrySave={flushSave} {...rest} />
      </DocEditorProvider>
    </div>
  );
};

export default BoardDocView;

type BoardDocBodyProps = Omit<BoardDocViewProps, "onSaveDocContent" | "onUploadFile" | "members" | "editable"> & {
  updated_at: string | null;
  save_status: DocSaveStatus;
  onRetrySave: () => void;
};

/** Everything inside the editor provider, so the actions can reach the editor (export, print, presentation). */
const BoardDocBody: React.FC<BoardDocBodyProps> = ({
  view,
  board_id,
  updated_at,
  save_status,
  onRetrySave,
  onRenameView,
  comments,
  share,
  is_header_collapsed = false,
  onToggleHeaderCollapsed,
}) => {
  const toast = useToast();
  const { branding } = useBranding();
  const { editor } = useDocEditor();
  const more_ref = useRef<HTMLButtonElement>(null);
  const [is_more_open, setIsMoreOpen] = useState(false);
  const [is_share_open, setIsShareOpen] = useState(false);
  const [share_link, setShareLink] = useState<BoardViewShareLinkDto | null>(null);
  const [presentation_content, setPresentationContent] = useState<string | null>(null);
  const [is_presenting, setIsPresenting] = useState(false);
  const [is_outline_open, setIsOutlineOpen] = useState(false);
  const [is_full_width, setIsFullWidth] = useState(false);

  useEffect(() => {
    setIsOutlineOpen(readDocFlag(DOC_OUTLINE_STORAGE_KEY));
    setIsFullWidth(readDocFlag(DOC_FULL_WIDTH_STORAGE_KEY));
  }, []);

  // The tab's public link is only needed once the Share dialog opens.
  useEffect(() => {
    if (!is_share_open) return;
    let cancelled = false;
    boardShareService
      .getLink(board_id, view.id)
      .then((link) => {
        if (!cancelled) setShareLink(link);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [is_share_open, board_id, view.id]);

  const toggleOutline = () => {
    setIsOutlineOpen((current) => {
      writeDocFlag(DOC_OUTLINE_STORAGE_KEY, !current);
      return !current;
    });
  };

  const toggleFullWidth = () => {
    setIsFullWidth((current) => {
      writeDocFlag(DOC_FULL_WIDTH_STORAGE_KEY, !current);
      return !current;
    });
  };

  const startPresentation = () => {
    setPresentationContent(editor ? serializeDocContent(editor.getJSON()) : view.doc_content);
    setIsPresenting(true);
  };

  const toggleComments = () => {
    if (!comments) return;
    if (comments.is_open) comments.close();
    else comments.open();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("We couldn't copy the link.");
    }
  };

  const togglePublicLink = async (is_enabled: boolean) => {
    const link =
      is_enabled && !share_link
        ? await boardShareService.enableLink(board_id, view.id)
        : await boardShareService.updateLink(board_id, view.id, { is_enabled });
    setShareLink(link);
  };

  const runMenuAction = (action: () => void | Promise<void>) => () => {
    setIsMoreOpen(false);
    void action();
  };

  const outline_label = is_outline_open ? "Hide outline" : "Show outline";
  const header_label = is_header_collapsed ? "Expand header" : "Collapse header";

  const more_sections: ActionMenuSection[] = [
    {
      key: "view",
      items: [
        { key: "outline", label: outline_label, icon: <ListTree size={ICON_SIZE} />, onClick: runMenuAction(toggleOutline) },
        { key: "present", label: "Present", icon: <Presentation size={ICON_SIZE} />, onClick: runMenuAction(startPresentation) },
        ...(comments
          ? [
              {
                key: "comments",
                label: comments.is_open ? "Hide comments" : "Show comments",
                icon: <MessageCircle size={ICON_SIZE} />,
                onClick: runMenuAction(toggleComments),
              },
            ]
          : []),
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
            if (editor) downloadMarkdown(view.label, editor.getMarkdown());
          }),
        },
        {
          key: "print",
          label: "Print or save as PDF",
          icon: <Printer size={ICON_SIZE} />,
          onClick: runMenuAction(() => {
            if (editor) printDoc(view.label, editor.getHTML());
          }),
        },
      ],
    },
  ];

  const trailing = (
    <>
      <DocSaveIndicator status={save_status} onRetry={onRetrySave} />
      <PresenceAvatarStack board_id={board_id} />
      {comments && (
        <button
          type="button"
          className={`doc-icon-button doc-comments-toggle${comments.is_open ? " is-active" : ""}`}
          aria-label="Comments"
          title="Comments"
          aria-pressed={comments.is_open}
          onClick={toggleComments}
        >
          <MessageCircle size={18} />
          {comments.comment_count > 0 && (
            <span className={`doc-comments-count${comments.has_unseen_comments ? " is-unseen" : ""}`}>
              {comments.comment_count > 99 ? "99+" : comments.comment_count}
            </span>
          )}
        </button>
      )}
      <button type="button" className="doc-icon-button" aria-label="Presentation" title="Presentation" onClick={startPresentation}>
        <Presentation size={18} />
      </button>
      {share ? (
        <div className="flex items-center rounded border border-[var(--doc-border-strong)]">
          <button type="button" className="doc-button rounded-r-none" onClick={() => setIsShareOpen(true)}>
            <UserPlus size={ICON_SIZE} />
            Share
          </button>
          <span className="h-5 w-px bg-[var(--doc-border-strong)]" aria-hidden="true" />
          <button type="button" className="doc-icon-button rounded-l-none" aria-label="Copy link" title="Copy link" onClick={() => void copyLink()}>
            <Link2 size={ICON_SIZE} />
          </button>
        </div>
      ) : (
        <button type="button" className="doc-icon-button" aria-label="Copy link" title="Copy link" onClick={() => void copyLink()}>
          <Link2 size={ICON_SIZE} />
        </button>
      )}
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
      {onToggleHeaderCollapsed && (
        <button
          type="button"
          className={`doc-icon-button${is_header_collapsed ? " is-active" : ""}`}
          aria-label={header_label}
          title={header_label}
          aria-pressed={is_header_collapsed}
          onClick={onToggleHeaderCollapsed}
        >
          {is_header_collapsed ? <ChevronsDown size={18} /> : <ChevronsUp size={18} />}
        </button>
      )}
    </>
  );

  return (
    <>
      <DocToolbar trailing={trailing} />

      <div className="relative flex min-h-0 flex-1">
        <aside className={`doc-print-hidden flex flex-none flex-col items-start pt-6 pl-4 ${is_outline_open ? "border-r border-[var(--doc-border)]" : ""}`}>
          <Tooltip content={outline_label} placement="right" className="flex">
            <button
              type="button"
              className={`doc-icon-button${is_outline_open ? " is-active" : ""}`}
              aria-label={outline_label}
              aria-pressed={is_outline_open}
              onClick={toggleOutline}
            >
              <ListTree size={18} />
            </button>
          </Tooltip>
          {is_outline_open && <DocOutline />}
        </aside>

        <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto pb-24">
          <div className={`mx-auto w-full px-6 pt-10 sm:px-16 ${is_full_width ? "max-w-none" : "max-w-[860px]"}`}>
            <DocTitle
              label={view.label}
              editable={!!onRenameView}
              onRename={onRenameView ?? (() => Promise.resolve())}
              onEnter={() => editor?.commands.focus("start")}
              aria_label="Doc tab title"
            />
            <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mt-4 mb-8" />
            <DocEditorSurface />
          </div>
        </div>

        {comments && <DocCommentsPanel drawer={comments} />}
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
      {share && (
        <DocShareModal
          {...share}
          is_open={is_share_open}
          onClose={() => setIsShareOpen(false)}
          board_id={board_id}
          company_name={branding.company_name}
          public_link={{
            is_enabled: share_link?.is_enabled ?? false,
            url: share_link?.token ? buildSharedViewUrl(share_link.token) : null,
          }}
          onTogglePublicLink={togglePublicLink}
        />
      )}
      <DocPresentationMode
        is_open={is_presenting}
        onClose={() => setIsPresenting(false)}
        content={presentation_content}
        heading={
          <>
            <div className="doc-presentation-title-row">
              <h1 className="doc-presentation-title">{view.label}</h1>
            </div>
            <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mt-4 mb-10" />
          </>
        }
      />
    </>
  );
};
