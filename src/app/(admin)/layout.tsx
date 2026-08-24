"use client";

import { useAuth } from "@/context/AuthContext";
import AppSidebar from "@/layout/AppSidebar";
import AppTopBar from "@/layout/AppTopBar";
import Backdrop from "@/layout/Backdrop";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-shell-bg">
      <AppTopBar />
      <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
        <AppSidebar />
        <Backdrop />
        <main className="shell-scrollbar h-full flex-1 overflow-y-auto bg-shell-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
