import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

type AuthState =
  | { status: "checking"; user: null }
  | { status: "anon"; user: null }
  | { status: "authed"; user: User };

export interface Auth {
  status: AuthState["status"];
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called by data hooks when the backend reports the session expired. */
  expire: () => void;
}

/** Manage the login session: restore on mount, login, logout. */
export function useAuth(): Auth {
  const [state, setState] = useState<AuthState>(() =>
    api.hasToken() ? { status: "checking", user: null } : { status: "anon", user: null },
  );

  useEffect(() => {
    if (state.status !== "checking") return;
    let alive = true;
    api
      .me()
      .then((user) => alive && setState({ status: "authed", user }))
      .catch(() => alive && setState({ status: "anon", user: null }));
    return () => {
      alive = false;
    };
  }, [state.status]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await api.login(username, password);
    setState({ status: "authed", user });
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: "anon", user: null });
  }, []);

  const expire = useCallback(() => setState({ status: "anon", user: null }), []);

  return { status: state.status, user: state.user, login, logout, expire };
}
