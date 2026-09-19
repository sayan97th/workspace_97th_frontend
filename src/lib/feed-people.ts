import type { BoardPersonOption } from "@/components/board/toolbar/types";
import type { MentionTeam } from "@/components/board/drawer/mentionOptions";
import { feedService } from "@/services/feed.service";
import { peopleService } from "@/services/people.service";
import { getUserInitials } from "@/lib/user";

const people_by_board = new Map<string, Promise<BoardPersonOption[]>>();

/**
 * The workspace members a reply on `board_id` can `@mention`, shaped for the
 * shared mention picker. Cached per board for the page's lifetime, since a
 * feed of many cards from one board would otherwise ask for the same roster
 * once per card. A failed request is evicted so the next focus can retry.
 */
export function loadFeedBoardPeople(board_id: string): Promise<BoardPersonOption[]> {
  const cached = people_by_board.get(board_id);
  if (cached) return cached;

  const request = feedService
    .listBoardPeople(board_id)
    .then((people) =>
      people.map((person) => ({
        id: String(person.id),
        name: person.name,
        initials: getUserInitials({ full_name: person.name }),
        avatar_seed: person.id,
        avatar_url: person.avatar_url ?? undefined,
      }))
    )
    .catch((error) => {
      people_by_board.delete(board_id);
      throw error;
    });
  people_by_board.set(board_id, request);
  return request;
}

/**
 * The account teams a reply on `board_id` can group `@mention`, each with the
 * ids of its members inside that board's workspace. `peopleService` caches the
 * request per board, so a feed of many cards from one board asks once.
 */
export async function loadFeedBoardTeams(board_id: string): Promise<MentionTeam[]> {
  const teams = await peopleService.listBoardTeams(board_id);
  return teams.map((team) => ({ id: String(team.id), name: team.name, member_ids: team.member_ids.map(String) }));
}
