import { AdminProvider } from "@/admin/components/AdminContext";
import { Sidebar } from "@/admin/components/Sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </AdminProvider>
  );
}
