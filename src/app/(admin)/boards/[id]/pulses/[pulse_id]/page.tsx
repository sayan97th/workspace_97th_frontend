/**
 * `/boards/{board_id}/pulses/{pulse_id}` — deep link to a single item's
 * detail drawer, optionally scoped to a non-primary tab via `?view_id=`.
 *
 * Route marker only: `BoardRouteView`, mounted once by the parent
 * `layout.tsx`, reads `pulse_id`/`view_id` via `BoardRouteContext` (which
 * derives them straight from the router) and passes them down as
 * `initial_open_item_id`/`active_view_id` to the already-mounted view — so
 * navigating here from `/boards/{board_id}` just opens that item's drawer
 * in place instead of re-fetching and remounting the whole board.
 */
export default function BoardPulsePage() {
  return null;
}
