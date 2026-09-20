import { apiClient } from "@/lib/api-client";

/** Shape returned by `App\Http\Controllers\People\PersonCardController`. */
export type PersonCardDto = {
  id: number;
  name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  timezone: string | null;
  /** The account was disabled or deleted. */
  is_deactivated?: boolean;
};

/** Shape returned by `App\Http\Controllers\People\MentionTeamController`: an account team and its members inside the board's workspace. */
export type MentionTeamDto = {
  id: number;
  name: string;
  member_ids: number[];
};

const card_cache = new Map<string, Promise<PersonCardDto>>();
const teams_cache = new Map<string, Promise<MentionTeamDto[]>>();

/**
 * Talks to `App\Http\Controllers\People\PersonCardController`
 * (workspace_97th_api).
 */
export const peopleService = {
  /**
   * GET /api/people/{id}/card. Cached per person for the page's lifetime, so
   * hovering the same mention repeatedly costs a single request. A failed
   * request is evicted, letting the next hover retry.
   */
  getCard(person_id: string | number): Promise<PersonCardDto> {
    const key = String(person_id);
    const cached = card_cache.get(key);
    if (cached) return cached;

    const request = apiClient
      .get<{ data: PersonCardDto }>(`/api/people/${key}/card`)
      .then((response) => response.data)
      .catch((error) => {
        card_cache.delete(key);
        throw error;
      });
    card_cache.set(key, request);
    return request;
  },

  /**
   * GET /api/people/boards/{board_id}/teams, the account teams a comment on
   * that board can group `@mention`. Cached per board for the page's
   * lifetime, since every open composer asks for the same list. A failed
   * request is evicted, letting the next open retry.
   */
  listBoardTeams(board_id: string | number): Promise<MentionTeamDto[]> {
    const key = String(board_id);
    const cached = teams_cache.get(key);
    if (cached) return cached;

    const request = apiClient
      .get<{ data: MentionTeamDto[] }>(`/api/people/boards/${key}/teams`)
      .then((response) => response.data)
      .catch((error) => {
        teams_cache.delete(key);
        throw error;
      });
    teams_cache.set(key, request);
    return request;
  },
};
