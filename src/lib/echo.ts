import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type {
  ChannelAuthorizationCallback,
  ChannelAuthorizationData,
} from "pusher-js/types/src/core/auth/options";

// Makes Pusher available globally so laravel-echo can pick it up.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).Pusher = Pusher;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const REVERB_APP_KEY = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "";
const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost";
const REVERB_PORT = parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? "8080", 10);
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

// Module-level singleton, reused across the whole app.
let echo_instance: Echo<"reverb"> | null = null;

/**
 * Returns the shared Echo/Reverb client, creating it on first call. Requires
 * a JWT, since this app authenticates via `php-open-source-saver/jwt-auth`
 * rather than Sanctum session cookies, so channel authorization cannot rely
 * on Echo's default cookie-based authorizer.
 */
export function getEcho(token: string): Echo<"reverb"> {
  if (echo_instance) return echo_instance;

  const force_tls = REVERB_SCHEME === "https";

  echo_instance = new Echo({
    broadcaster: "reverb",
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: force_tls ? undefined : REVERB_PORT,
    wssPort: force_tls ? REVERB_PORT : undefined,
    forceTLS: force_tls,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    // Custom authorizer: every private-channel auth request carries the JWT
    // in the Authorization header, instead of relying on session cookies.
    authorizer: (channel: { name: string }) => ({
      authorize: (socket_id: string, callback: ChannelAuthorizationCallback) => {
        const body = new URLSearchParams({
          socket_id,
          channel_name: channel.name,
        }).toString();

        fetch(`${API_BASE_URL}/api/broadcasting/auth`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Broadcasting auth failed: ${response.status}`);
            }
            return response.json() as Promise<ChannelAuthorizationData>;
          })
          .then((data) => callback(null, data))
          .catch((error: Error) => callback(error, null));
      },
    }),
  });

  return echo_instance;
}

/** Tears down the websocket connection, called on logout. */
export function resetEcho(): void {
  if (echo_instance) {
    echo_instance.disconnect();
    echo_instance = null;
  }
}

/**
 * Follows the websocket connection state (`connected`, `connecting`,
 * `unavailable`, `failed`, `disconnected`...), so callers can fall back to the
 * REST API when the browser, an extension or the network blocks the socket.
 * Calls `handler` right away with the current state.
 *
 * @returns A function that stops listening.
 */
export function subscribeToConnectionState(token: string, handler: (state: string) => void): () => void {
  const connection = getEcho(token).connector.pusher.connection;
  const onStateChange = (states: { current: string }) => handler(states.current);

  connection.bind("state_change", onStateChange);
  handler(connection.state);

  return () => connection.unbind("state_change", onStateChange);
}

const private_channel_subscribers = new Map<string, number>();

/**
 * Listens for `event` on a private channel that more than one part of the app
 * may be subscribed to at once (the top bar's feed badge and the feed drawer
 * both follow `feed.{user_id}`). Each caller only removes its own handler on
 * cleanup, and the channel itself is left only once the last subscriber goes,
 * so one component unmounting never silences another.
 *
 * @returns A function that removes this subscription.
 */
export function listenOnPrivateChannel<TPayload>(
  token: string,
  channel_name: string,
  event: string,
  handler: (payload: TPayload) => void
): () => void {
  const echo = getEcho(token);
  const channel = echo.private(channel_name).listen(event, handler);
  private_channel_subscribers.set(channel_name, (private_channel_subscribers.get(channel_name) ?? 0) + 1);

  return () => {
    channel.stopListening(event, handler);
    const remaining = (private_channel_subscribers.get(channel_name) ?? 1) - 1;
    if (remaining > 0) {
      private_channel_subscribers.set(channel_name, remaining);
      return;
    }
    private_channel_subscribers.delete(channel_name);
    echo.leave(channel_name);
  };
}
