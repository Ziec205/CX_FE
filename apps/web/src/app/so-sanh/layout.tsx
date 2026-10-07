import type { Metadata } from "next";

export const metadata: Metadata = { title: "So sánh cây" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
