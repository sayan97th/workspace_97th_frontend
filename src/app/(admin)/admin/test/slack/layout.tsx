import SlackTestShell from "@/components/slack-test/SlackTestShell";

/** Both Slack testing pages share one frame, so the rail and header stay put while moving between them. */
export default function SlackTestLayout({ children }: { children: React.ReactNode }) {
  return <SlackTestShell>{children}</SlackTestShell>;
}
