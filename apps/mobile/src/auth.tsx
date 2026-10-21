import { ApiError, createApi, type Organization, type Session } from "@jojobuilds/api-client";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";

const TOKEN_KEY = "jojobuilds.session";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000/api/v1";
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://10.0.2.2:3000";

interface AuthState {
  session: Session | null;
  org: Organization | null;
  loading: boolean;
  error: string;
  api: ReturnType<typeof createApi>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectOrg: (id: string) => void;
  restore: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              count < 1,
            staleTime: 15_000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const token = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const org =
    session?.organizations.find((item) => item.id === organizationId) ??
    session?.organizations[0] ??
    null;
  const api = useMemo(
    () =>
      createApi({
        baseUrl: API_URL,
        credentials: "omit",
        headers: () => ({
          ...(token.current ? { Authorization: `Bearer ${token.current}` } : {}),
          ...(org ? { "X-Organization": org.id } : {}),
        }),
        onUnauthorized: () => {
          token.current = null;
          client.clear();
          setSession(null);
          setError("Your session expired or was revoked. Sign in again.");
          void SecureStore.deleteItemAsync(TOKEN_KEY).catch((problem: unknown) =>
            setError(
              problem instanceof Error
                ? problem.message
                : "Could not clear the expired secure session.",
            ),
          );
        },
      }),
    [org, client],
  );

  const restore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      token.current = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token.current) {
        try {
          const sessionApi = createApi({
            baseUrl: API_URL,
            credentials: "omit",
            headers: (): Record<string, string> =>
              token.current ? { Authorization: `Bearer ${token.current}` } : {},
          });
          setSession(await sessionApi.request<Session>("/auth/session"));
        } catch (problem) {
          if (problem instanceof ApiError && problem.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            token.current = null;
            client.clear();
            setSession(null);
            setError("Your session expired. Sign in again.");
          } else throw problem;
        }
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not restore secure session.");
    } finally {
      setLoading(false);
    }
  }, [client]);
  useEffect(() => {
    void restore();
  }, [restore]);

  async function login(email: string, password: string) {
    const result = await api.post<Session>("/auth/mobile-login", { email, password });
    if (!result.token) throw new Error("The server did not return a mobile session.");
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    } catch (problem) {
      // Revoke the newly created server session if secure device storage failed.
      await createApi({
        baseUrl: API_URL,
        credentials: "omit",
        headers: () => ({ Authorization: `Bearer ${result.token}` }),
      }).post("/auth/logout", {});
      throw problem;
    }
    token.current = result.token;
    client.clear();
    setError("");
    setSession(result);
  }
  async function logout() {
    let remoteError = "";
    try {
      await api.post("/auth/logout", {});
    } catch (problem) {
      remoteError =
        problem instanceof Error ? problem.message : "Could not revoke the server session.";
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    token.current = null;
    client.clear();
    setSession(null);
    if (remoteError)
      Alert.alert(
        "Signed out on this device",
        `Local credentials were removed, but server revocation could not be confirmed. The server session expires automatically. ${remoteError}`,
      );
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        org,
        loading,
        error,
        api,
        login,
        logout,
        restore,
        selectOrg: (id) => {
          client.clear();
          setOrganizationId(id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
