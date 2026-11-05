import { AdminProvider } from "@/admin/components/AdminContext";
import { Sidebar } from "@/admin/components/Sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <div className="flex min-h-screen flex-col bg-white md:flex-row">
        <Sidebar />
        <main className="cx-admin min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </AdminProvider>
  );
}
