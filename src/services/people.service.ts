import { apiClient } from "@/lib/api-client";

/** Shape returned by `App\Http\Controllers\People\PersonCardController`. */
export type PersonCardDto = {
  id: number;
  name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  timezone: string | null;
};

const card_cache = new Map<string, Promise<PersonCardDto>>();

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
};
