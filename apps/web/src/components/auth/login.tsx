"use client";

import { createApi, type Session } from "@jojobuilds/api-client";
import { ArrowUpRight, Building2, CircleHelp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ErrorBox, Field } from "../ui";
import { FormPrivacyNotice } from "../policy-links";
import { GoogleButton } from "./google-button";

type Api = ReturnType<typeof createApi>;

export function Login({ api, onLogin }: { api: Api; onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "recover" | "redeem">("login");
  const [token, setToken] = useState("");
  const [invitation, setInvitation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("auth_error")) {
      window.history.replaceState(null, "", "/");
      queueMicrotask(() =>
        setError(
          "Google sign-in was not completed. For an existing password account, sign in and use Connect Google account first. New users need a matching invitation.",
        ),
      );
    }
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
    <main id="main-content" className="login-page">
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
          <FormPrivacyNotice />
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
          {mode === "redeem" && invitation && (
            <label className="choice">
              <input type="checkbox" required /> I accept the <Link href="/legal/terms">terms</Link>{" "}
              and have read the <Link href="/legal/privacy">privacy notice</Link>. This is not
              marketing consent.
            </label>
          )}
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
        {mode !== "recover" && (
          <GoogleButton api={api} invitation={invitation ? token : undefined} />
        )}
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
