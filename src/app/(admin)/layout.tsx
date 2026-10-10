"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { BrandingProvider } from "@/context/BrandingContext";
import AppSidebar from "@/layout/AppSidebar";
import AppTopBar from "@/layout/AppTopBar";
import Backdrop from "@/layout/Backdrop";
import ImpersonationBanner from "@/components/admin/impersonation/ImpersonationBanner";
import OrganizationAnnouncementBanner from "@/components/organization/OrganizationAnnouncementBanner";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { useIsEmbedded } from "@/hooks/useIsEmbedded";
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
  const is_embedded = useIsEmbedded();

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

  // Inside a frame ("Open in overlay" on a sidebar board) only the page renders, the overlay has its own header.
  if (is_embedded) {
    return (
      <BrandingProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <main className="shell-scrollbar h-screen w-full overflow-y-auto bg-shell-bg">{children}</main>
          </ToastProvider>
        </WorkspaceProvider>
      </BrandingProvider>
    );
  }

  return (
    <BrandingProvider>
    <WorkspaceProvider>
      <ToastProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-shell-bg">
          <AppTopBar />
          <ImpersonationBanner />
          <OrganizationAnnouncementBanner />
          <div className="relative flex min-h-0 w-full flex-1 overflow-hidden bg-sidebar-rail">
            <AppSidebar />
            <Backdrop />
            {/* The page continues the sidebar panel's card, its left border is the single divider between them,
                and the corner rounds once the panel is collapsed. */}
            <main
              className={`shell-scrollbar h-full min-w-0 flex-1 overflow-y-auto border-t border-sidebar-edge bg-shell-bg lg:border-l ${
                isExpanded ? "" : "lg:rounded-tl-2xl"
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </WorkspaceProvider>
    </BrandingProvider>
  );
}
