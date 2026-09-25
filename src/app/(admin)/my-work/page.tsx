import type { Metadata } from "next";
import MyWorkView from "@/components/my-work/MyWorkView";

export const metadata: Metadata = {
  title: "My work",
  description: "Everything assigned to you across all boards",
};

export default function MyWorkPage() {
  return <MyWorkView />;
}
