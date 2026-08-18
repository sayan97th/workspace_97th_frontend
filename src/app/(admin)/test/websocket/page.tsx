import type { Metadata } from "next";
import WebsocketTestView from "@/components/websocket-test/WebsocketTestView";

export const metadata: Metadata = {
  title: "Websocket Test | Workspace 97th",
  description: "Diagnostic screen for verifying the Reverb websocket connection and broadcast delivery",
};

export default function WebsocketTestPage() {
  return <WebsocketTestView />;
}
