import type { Metadata } from "next";

// `page.tsx` is a client component, so it cannot export `metadata` itself.
export const metadata: Metadata = {
  title: "Signing In",
};

export default function GoogleCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
