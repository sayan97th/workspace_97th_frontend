"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authService } from "@/services/auth.service";
import { boardInvitationService } from "@/services/board-invitation.service";
import { invitationService } from "@/services/invitation.service";
import { staffInvitationService } from "@/services/staff-invitation.service";
import { workspaceInviteLinkService } from "@/services/workspace-invite-link.service";
import { getToken } from "@/lib/api-client";
import { resetEcho } from "@/lib/echo";
import type { User, AuthResponse, LoginCredentials, RegisterData, ApiError } from "@/types/auth";
import type { AcceptBoardInvitationPayload } from "@/types/board-invitation";
import type { AcceptInvitationPayload, JoinWorkspaceByLinkPayload } from "@/types/invitation";
import type { AcceptStaffInvitationPayload } from "@/types/staff-invitation";

export type LoginResult =
  | { requires_two_factor: false }
  | { requires_two_factor: true; two_factor_token: string };

type AuthContextType = {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Returns true when the user has ALL of the given roles. */
  hasRole: (...roles: string[]) => boolean;
  /** Returns true when the user has ANY of the given roles. */
  hasAnyRole: (...roles: string[]) => boolean;
  /** Returns true when the user has ALL of the given permissions. */
  hasPermission: (...perms: string[]) => boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  loginWithTwoFactor: (two_factor_token: string, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  /** Accepts a workspace invitation (creating/authenticating its account) and starts a session, like `register`. */
  acceptInvitation: (code: string, payload: AcceptInvitationPayload) => Promise<void>;
  /** Accepts a board invitation (creating/authenticating its account) and starts a session, like `register`. */
  acceptBoardInvitation: (code: string, payload: AcceptBoardInvitationPayload) => Promise<void>;
  /** Accepts an Administration "Invite" staff invitation (always creates a brand-new account) and starts a session, like `register`. */
  acceptStaffInvitation: (code: string, payload: AcceptStaffInvitationPayload) => Promise<void>;
  /** Joins a workspace through its shareable invite link (creating/authenticating its account) and starts a session, like `register`. */
  joinWorkspaceByLink: (code: string, payload: JoinWorkspaceByLinkPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived role helpers ──────────────────────────────────────────────────

  const getUserRoleNames = useCallback((): string[] => {
    if (!user?.roles) return [];
    return user.roles.map((r) => (typeof r === "string" ? r : r.name));
  }, [user]);

  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      const user_roles = getUserRoleNames();
      return roles.every((r) => user_roles.includes(r));
    },
    [getUserRoleNames]
  );

  const hasAnyRole = useCallback(
    (...roles: string[]): boolean => {
      const user_roles = getUserRoleNames();
      return roles.some((r) => user_roles.includes(r));
    },
    [getUserRoleNames]
  );

  const hasPermission = useCallback(
    (...perms: string[]): boolean => perms.every((p) => permissions.includes(p)),
    [permissions]
  );

  // ── Token refresh scheduling ──────────────────────────────────────────────

  const scheduleRefreshRef = useRef<() => void>(() => {});

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const expires_at = localStorage.getItem("token_expires_at");
    if (!expires_at) return;

    const expires_in = parseInt(expires_at) - Date.now();
    const refresh_in = Math.max(expires_in - 5 * 60 * 1000, 0);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await authService.refresh();
        setUser(data.user);
        scheduleRefreshRef.current();
      } catch {
        setUser(null);
        setPermissions([]);
      }
    }, refresh_in);
  }, []);

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  // ── Init ──────────────────────────────────────────────────────────────────

  const initAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setUser(data.user);
      setPermissions(data.permissions);
      scheduleRefresh();
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    initAuth();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [initAuth]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    const data = await authService.login(credentials);

    // 2FA challenge — return the temp token so the UI can show the OTP step.
    if ("requires_two_factor" in data && data.requires_two_factor) {
      return { requires_two_factor: true, two_factor_token: data.two_factor_token };
    }

    const auth_data = data as AuthResponse;
    setUser(auth_data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
    return { requires_two_factor: false };
  };

  const loginWithTwoFactor = async (two_factor_token: string, code: string): Promise<void> => {
    const data = await authService.loginWithTwoFactor({ two_factor_token, code });
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const register = async (register_data: RegisterData) => {
    const data = await authService.register(register_data);
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const acceptInvitation = async (code: string, payload: AcceptInvitationPayload) => {
    const data = await invitationService.acceptInvitation(code, payload);
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const acceptBoardInvitation = async (code: string, payload: AcceptBoardInvitationPayload) => {
    const data = await boardInvitationService.acceptInvitation(code, payload);
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const acceptStaffInvitation = async (code: string, payload: AcceptStaffInvitationPayload) => {
    const data = await staffInvitationService.acceptInvitation(code, payload);
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const joinWorkspaceByLink = async (code: string, payload: JoinWorkspaceByLinkPayload) => {
    const data = await workspaceInviteLinkService.joinByLink(code, payload);
    setUser(data.user);
    try {
      const me_data = await authService.getMe();
      setPermissions(me_data.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setPermissions(data.permissions);
    } catch {
      // keep current state if refresh fails
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setPermissions([]);
    resetEcho();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        hasRole,
        hasAnyRole,
        hasPermission,
        login,
        loginWithTwoFactor,
        register,
        acceptInvitation,
        acceptBoardInvitation,
        acceptStaffInvitation,
        joinWorkspaceByLink,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export type { ApiError };
