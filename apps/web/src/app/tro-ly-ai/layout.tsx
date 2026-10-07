import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trợ lý AI" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
