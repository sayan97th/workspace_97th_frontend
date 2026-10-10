"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import AppSidebar from "@/layout/AppSidebar";
import AppTopBar from "@/layout/AppTopBar";
import Backdrop from "@/layout/Backdrop";
import ImpersonationBanner from "@/components/admin/impersonation/ImpersonationBanner";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isExpanded } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shell-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <ToastProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-shell-bg">
          <AppTopBar />
          <ImpersonationBanner />
          <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
            <AppSidebar />
            <Backdrop />
            {/* The page continues the sidebar panel's card: a top border, and the rounded corner once the panel is collapsed. */}
            <main
              className={`shell-scrollbar h-full min-w-0 flex-1 overflow-y-auto border-t border-sidebar-border bg-shell-bg ${
                isExpanded ? "" : "lg:rounded-tl-2xl lg:border-l"
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
