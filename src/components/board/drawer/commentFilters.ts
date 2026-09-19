import type { DrawerComment, DrawerReply } from "./types";

/** The client-side filters the item and board discussion drawers apply to their loaded threads. */
export type CommentFilters = {
  /** Free-text search over the update body and the author's name. */
  search: string;
  author_id: string | null;
  only_pinned: boolean;
  /** Only threads where the viewer bookmarked the update or one of its replies. */
  only_bookmarked: boolean;
  with_files: boolean;
  /** Only threads where the current user is `@mentioned`. */
  mentioning_me: boolean;
};

export const default_comment_filters: CommentFilters = {
  search: "",
  author_id: null,
  only_pinned: false,
  only_bookmarked: false,
  with_files: false,
  mentioning_me: false,
};

/** How many filters are narrowing the thread, for the "Clear" button and the empty state. */
export const countActiveCommentFilters = (filters: CommentFilters): number =>
  [filters.search.trim() !== "", filters.author_id !== null, filters.only_pinned, filters.only_bookmarked, filters.with_files, filters.mentioning_me].filter(Boolean).length;

/**
 * A rough plain-text reading of a Markdown body, so searching for "budget"
 * finds it inside `**budget**` or `[budget](https://...)` without matching the
 * link's URL. Images become their alt text, everything else that is only
 * syntax is dropped.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/[*_~`>#]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every message of a thread: the top-level comment, then its replies. */
const messagesOf = (comment: DrawerComment): DrawerReply[] => [comment, ...comment.replies];

/**
 * The threads that pass every active filter, order kept. A thread matches on
 * any of its messages for search, author, mentions and bookmarks, so a hit inside a reply
 * still shows the whole conversation around it. Pinned and with-files look at
 * the top-level comment, the only message that can be pinned or carry files.
 */
export function filterComments(comments: DrawerComment[], filters: CommentFilters, current_user_id: string): DrawerComment[] {
  if (countActiveCommentFilters(filters) === 0) return comments;

  const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return comments.filter((comment) => {
    if (filters.only_pinned && !comment.pinned) return false;
    if (filters.with_files && comment.attachments.length === 0) return false;

    const messages = messagesOf(comment);
    if (filters.only_bookmarked && !messages.some((message) => message.bookmarked_by_me)) return false;
    if (filters.author_id && !messages.some((message) => message.author.id === filters.author_id)) return false;
    if (filters.mentioning_me && !messages.some((message) => message.mentioned_user_ids?.includes(current_user_id))) return false;

    if (terms.length > 0) {
      const haystack = messages
        .map((message) => `${message.author.name} ${markdownToPlainText(message.body)}`)
        .join(" ")
        .toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }

    return true;
  });
}

/** The people who wrote something in the given threads, each once, for the author menu. */
export function commentAuthors(comments: DrawerComment[]): { id: string; name: string }[] {
  const authors = new Map<string, string>();
  for (const comment of comments) {
    for (const message of messagesOf(comment)) {
      if (message.author.id !== "0") authors.set(message.author.id, message.author.name);
    }
  }
  return [...authors.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}
