"use client";

import { useEffect, useState } from "react";
import { clearSummary } from "@/lib/offline";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", install);
    return () => window.removeEventListener("beforeinstallprompt", install);
  }, []);
  async function enable() {
    setBusy(true);
    try {
      if (process.env.NODE_ENV !== "production")
        throw new Error("Offline app access needs the production preview: npm run local.");
      if (!("serviceWorker" in navigator) || !window.isSecureContext)
        throw new Error("Use HTTPS or localhost in a browser supporting service workers.");
      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Offline setup did not finish. Check your connection and retry.")),
            30_000,
          ),
        ),
      ]);
      setMessage(
        "Offline app access enabled. Save a summary separately in workspace settings; no records are saved automatically.",
      );
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : "Offline access failed.");
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration?.active?.scriptURL === new URL("/sw.js", location.origin).href)
          await registration.unregister();
      }
      if ("caches" in window)
        for (const name of await caches.keys())
          if (name.startsWith("jojobuilds-shell-")) await caches.delete(name);
      if (!clearSummary()) throw new Error("Browser storage unavailable");
      setMessage(
        "Offline app cache and saved summary removed. Close other app tabs and reopen to release the service worker. Downloaded files are not deleted.",
      );
    } catch {
      setMessage("Could not remove all storage. Remove site data in your browser settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="pwa-controls">
      <summary>Install app / offline access</summary>
      <p>
        Install from your browser menu, or on iPhone use Share, then Add to Home Screen.
        Installation does not download the complete database or keep your PC server running.
      </p>
      {prompt && (
        <button
          className="button primary"
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          Install JOJOBUILDS
        </button>
      )}
      <p>
        Enable offline app access to save the public offline screen and app assets on this device.
        Saving rental totals is a separate choice.
      </p>
      <div className="pwa-actions">
        <button className="button secondary" disabled={busy} onClick={() => void enable()}>
          Enable offline app access
        </button>
        <button className="button secondary" disabled={busy} onClick={() => void disable()}>
          Disable offline app access and clear summary
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
