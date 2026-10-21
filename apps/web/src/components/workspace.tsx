"use client";

import {
  ApiError,
  canFinance,
  canManageTenants,
  createApi,
  type Organization,
  type Session,
} from "@jojobuilds/api-client";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Overview,
  PropertiesPanel,
  TenantsPanel,
  PaymentsPanel,
  MaintenancePanel,
  SettingsPanel,
  NotificationsPanel,
  type FormKind,
} from "./workspace-panels";
import { WorkspaceForm } from "./workspace-forms";
import { ErrorBox, Field, Loading } from "./ui";

export type Api = ReturnType<typeof createApi>;
export interface WorkspaceContext {
  api: Api;
  org: Organization;
  period: string;
  refresh: () => Promise<void>;
  openForm: (kind: FormKind) => void;
  navigate: (tab: Tab) => void;
}
export type Tab =
  "overview" | "properties" | "tenants" | "payments" | "maintenance" | "notifications" | "settings";
const navigation = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "tenants", label: "Tenants", icon: Users },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "notifications", label: "Notifications", icon: Bell },
] as const;

export function Workspace() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500 && error.status !== 0) && count < 1,
            staleTime: 15_000,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionGate />
    </QueryClientProvider>
  );
}

function SessionGate() {
  const queryClient = useQueryClient();
  const api = useMemo(() => createApi({ baseUrl: "/api/v1" }), []);
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api.request<Session>("/auth/session"),
    retry: false,
  });
  if (session.isPending)
    return (
      <main className="boot">
        <div className="wordmark">
          JOJO<span>BUILDS</span>
        </div>
        <Loading />
      </main>
    );
  if (session.error && !(session.error instanceof ApiError && session.error.status === 401)) {
    return (
      <main className="boot">
        <ErrorBox message={session.error.message} retry={() => void session.refetch()} />
      </main>
    );
  }
  if (!session.data)
    return <Login api={api} onLogin={(data) => queryClient.setQueryData(["session"], data)} />;
  if (!session.data.organizations.length)
    return (
      <main className="boot">
        <ErrorBox message="Your account has no active organization. Contact the portfolio owner." />
        <button
          onClick={async () => {
            await createApi({
              baseUrl: "/api/v1",
              headers: () => ({ "X-CSRF-Token": session.data.csrf }),
            }).post("/auth/logout", {});
            queryClient.clear();
          }}
        >
          Sign out
        </button>
      </main>
    );
  return <AuthenticatedWorkspace session={session.data} />;
}

function Login({ api, onLogin }: { api: Api; onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "recover" | "redeem">("login");
  const [token, setToken] = useState("");
  const [invitation, setInvitation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const action = query.get("invite") || query.get("reset");
    if (action) {
      // Tokens leave browser history immediately and are never persisted in local storage.
      window.history.replaceState(null, "", "/");
      queueMicrotask(() => {
        setToken(action);
        setInvitation(query.has("invite"));
        setMode("redeem");
      });
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "login") {
        let result = await api.post<Session>("/auth/login", {
          email: data.get("email"),
          password: data.get("password"),
        });
        if (token && invitation) {
          const invitedApi = createApi({
            baseUrl: "/api/v1",
            headers: () => ({ "X-CSRF-Token": result.csrf }),
          });
          await invitedApi.post("/auth/accept-invitation", { reason: token });
          result = await invitedApi.request<Session>("/auth/session");
        }
        onLogin(result);
      } else if (mode === "recover") {
        const result = await api.post<{ message: string }>("/auth/recover", {
          email: data.get("email"),
        });
        setNotice(result.message);
      } else {
        const result = await api.post<{ message: string }>("/auth/redeem", {
          token,
          name: data.get("name"),
          password: data.get("password"),
        });
        setNotice(result.message);
        setMode("login");
        setToken("");
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="wordmark">
          <Building2 size={26} /> JOJO<span>BUILDS</span>
        </div>
        <div>
          <span className="eyebrow">PROPERTY MANAGEMENT, WITH PERSPECTIVE</span>
          <h1>
            Good spaces.
            <br />
            Better managed.
          </h1>
          <p>
            One clear view of your properties, your people,
            <br />
            and every payment in between.
          </p>
          <div className="architectural-art" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <footer>
          <ShieldCheck size={16} /> Your portfolio. Your private workspace.
        </footer>
      </section>
      <section className="login-form">
        <div className="mobile-brand wordmark">
          JOJO<span>BUILDS</span>
        </div>
        <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
        <h2>
          {mode === "login"
            ? "A little clarity starts here."
            : mode === "recover"
              ? "Let’s get you back in."
              : "Make yourself at home."}
        </h2>
        <p>
          {mode === "login"
            ? "Sign in to see what’s happening across your portfolio."
            : "Secure access to your JOJOBUILDS account."}
        </p>
        <form onSubmit={submit}>
          {mode !== "redeem" && (
            <Field label="Email address">
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </Field>
          )}
          {mode === "redeem" && (
            <Field label="Your name">
              <input name="name" autoComplete="name" maxLength={120} required />
            </Field>
          )}
          {mode !== "recover" && (
            <Field label={mode === "redeem" ? "New password (at least 12 characters)" : "Password"}>
              <input
                name="password"
                type="password"
                minLength={mode === "redeem" ? 12 : 1}
                maxLength={200}
                autoComplete={mode === "redeem" ? "new-password" : "current-password"}
                required
              />
            </Field>
          )}
          {error && <ErrorBox message={error} />}
          {notice && (
            <p className="success-box" role="status">
              {notice}
            </p>
          )}
          <button className="button primary wide" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in to JOJOBUILDS"
                : mode === "recover"
                  ? "Send recovery instructions"
                  : "Set up secure access"}
            <ArrowUpRight size={17} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "login" ? "recover" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Forgot your password?" : "Back to sign in"}
        </button>
        <div className="setup-note">
          <CircleHelp size={18} />
          <p>
            First time running locally? Create your account with the <code>bootstrap</code> command
            in the README. There are no default passwords.
          </p>
        </div>
      </section>
    </main>
  );
}

function AuthenticatedWorkspace({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(session.organizations[0].id);
  const org = session.organizations.find((item) => item.id === orgId) ?? session.organizations[0];
  const [tab, setTab] = useState<Tab>(
    ["caretaker", "maintenance", "agent"].includes(org.role) ? "properties" : "overview",
  );
  const [period, setPeriod] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: org.timezone }).slice(0, 7),
  );
  const [form, setForm] = useState<FormKind | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const api = useMemo(
    () =>
      createApi({
        baseUrl: "/api/v1",
        headers: () => ({ "X-CSRF-Token": session.csrf, "X-Organization": org.id }),
        onUnauthorized: () => {
          queryClient.clear();
          // Discard authenticated component state as well as the query cache.
          window.location.reload();
        },
      }),
    [session.csrf, org.id, queryClient],
  );
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [org.id] });
  };
  const ctx: WorkspaceContext = { api, org, period, refresh, openForm: setForm, navigate: setTab };
  const role = org.role;
  const tenant = role === "tenant";
  const allowed = navigation.filter(
    (item) =>
      (item.key !== "overview" || tenant || canFinance(role)) &&
      (item.key !== "tenants" || canManageTenants(role) || role === "finance") &&
      (item.key !== "payments" || canFinance(role) || tenant),
  );
  const current = allowed.find((item) => item.key === tab);
  const title = tab === "settings" ? "Workspace settings" : (current?.label ?? "Your portfolio");
  const navigate = (key: Tab) => {
    setTab(key);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link className="wordmark" href="/" aria-label="JOJOBUILDS home">
          <Building2 size={25} /> JOJO<span>BUILDS</span>
        </Link>
        <div className="workspace-selector">
          <span className="portfolio-icon">
            <Building2 size={19} />
          </span>
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <select
              aria-label="Select organization"
              value={orgId}
              onChange={(event) => {
                setOrgId(event.target.value);
                setTab("properties");
                setForm(null);
              }}
            >
              {session.organizations.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="role-chip">
          {tenant ? "TENANT PORTAL" : `${role.toUpperCase()} WORKSPACE`}
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {allowed.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => navigate(key)}
              aria-current={tab === key ? "page" : undefined}
            >
              <Icon size={18} />
              <span>
                {tenant && key === "overview"
                  ? "My home"
                  : tenant && key === "payments"
                    ? "My payments"
                    : label}
              </span>
              {tab === key && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="calm-note">
            <span className="mini-star">✧</span>
            <strong>A little more peace of mind.</strong>
            <p>
              Your records, connected.
              <br />
              Your next step, clear.
            </p>
          </div>
          <button
            className={tab === "settings" ? "side-setting active" : "side-setting"}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} /> Settings & access
          </button>
          <div className="sidebar-user">
            <span className="avatar">{session.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{session.name}</strong>
              <small>{role}</small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-btn"
              onClick={async () => {
                try {
                  setLogoutError("");
                  await api.post("/auth/logout", {});
                  queryClient.clear();
                  window.location.reload();
                } catch (error) {
                  setLogoutError(error instanceof Error ? error.message : "Sign out failed.");
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="private-label">
              <span /> PRIVATE WORKSPACE
            </span>
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => setTab("notifications")}
            >
              <Bell size={19} />
            </button>
            <span className="avatar small">{session.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="content" id="main-content">
          {org.demo && (
            <div className="demo-banner">
              <ShieldCheck size={15} /> DEMO PORTFOLIO — All names, payments and records are
              synthetic.
            </div>
          )}
          {logoutError && <ErrorBox message={logoutError} />}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tenant ? "YOUR HOME, ALL IN ONE PLACE" : "A CLEARER VIEW OF YOUR PORTFOLIO"}
              </div>
              <h1>
                {tab === "overview"
                  ? tenant
                    ? `Welcome home, ${session.name.split(" ")[0]}`
                    : `Looking good, ${session.name.split(" ")[0]}`
                  : title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {tab === "overview"
                  ? "Here’s where things stand. Let’s keep everything moving."
                  : "The details that keep your properties running smoothly."}
              </p>
            </div>
            <div className="heading-actions">
              <label className="period-select">
                <span className="sr-only">Reporting month</span>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => {
                    if (e.target.value) setPeriod(e.target.value);
                  }}
                />
              </label>
              {!tenant && canFinance(role) && (
                <button className="button primary" onClick={() => setForm("payment")}>
                  <Plus size={17} /> Record payment
                </button>
              )}
            </div>
          </div>
          {tab === "overview" && <Overview ctx={ctx} />}
          {tab === "properties" && <PropertiesPanel ctx={ctx} />}
          {tab === "tenants" && <TenantsPanel ctx={ctx} />}
          {tab === "payments" && <PaymentsPanel ctx={ctx} />}
          {tab === "maintenance" && <MaintenancePanel ctx={ctx} />}
          {tab === "notifications" && <NotificationsPanel ctx={ctx} />}
          {tab === "settings" && <SettingsPanel ctx={ctx} />}
          <footer className="content-footer">
            <span>
              JOJOBUILDS <span className="footer-divider">/</span> Thoughtfully managed.
            </span>
            <span>
              <ShieldCheck size={13} /> A private workspace, built around you.
            </span>
          </footer>
        </main>
        <nav className="mobile-bottom" aria-label="Mobile navigation">
          {allowed.slice(0, 4).map(({ key, label, icon: Icon }) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => navigate(key)}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
          <button onClick={() => setMenuOpen(true)}>
            <Menu size={19} />
            <span>More</span>
          </button>
        </nav>
      </div>
      {form && (
        <WorkspaceForm
          key={typeof form === "string" ? form : form.kind + ("id" in form ? form.id : "")}
          kind={form}
          ctx={ctx}
          close={() => setForm(null)}
        />
      )}
    </div>
  );
}
