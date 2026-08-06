/**
 * `/boards/{board_id}/views/{view_id}` — deep link to a specific tab.
 *
 * Route marker only: `BoardRouteView`, mounted once by the parent
 * `layout.tsx`, reads `view_id` via `BoardRouteContext` and passes it down
 * as `active_view_id` to the already-mounted view, which selects that tab
 * and applies its saved filter/sort/display state.
 */
export default function BoardViewPage() {
  return null;
}
