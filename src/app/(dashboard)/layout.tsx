import { AppSidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-black flex w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-screen">
          <Navbar />
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
