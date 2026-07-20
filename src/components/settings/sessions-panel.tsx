"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { formatDate } from "@/lib/i18n/format";

type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

// docs/outrun/03 "AUTHENTICATION — device management, logout from all
// devices". Uses Better Auth's core session endpoints directly
// (list-sessions/revoke-session/revoke-other-sessions) — no extra
// plugin needed, since this is "view and revoke my own sessions," not
// genuine concurrent multi-account sessions in one browser.
function describeDevice(userAgent?: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export function SessionsPanel({ currentToken }: { currentToken: string | null }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  async function load() {
    const { data, error: listError } = await authClient.listSessions();
    if (listError) {
      setError(listError.message ?? "We couldn't load your sessions.");
      return;
    }
    setSessions((data as Session[] | null) ?? []);
  }

  useEffect(() => {
    authClient.listSessions().then(({ data, error: listError }) => {
      if (listError) {
        setError(listError.message ?? "We couldn't load your sessions.");
        return;
      }
      setSessions((data as Session[] | null) ?? []);
    });
  }, []);

  async function handleRevoke(token: string) {
    setBusyToken(token);
    setError(null);
    const { error: revokeError } = await authClient.revokeSession({ token });
    setBusyToken(null);
    if (revokeError) {
      setError(revokeError.message ?? "We couldn't sign out that device.");
      return;
    }
    await load();
  }

  async function handleRevokeOthers() {
    setRevokingOthers(true);
    setError(null);
    const { error: revokeError } = await authClient.revokeOtherSessions();
    setRevokingOthers(false);
    if (revokeError) {
      setError(revokeError.message ?? "We couldn't sign out your other devices.");
      return;
    }
    await load();
  }

  if (sessions === null && !error) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading sessions…</p>;
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      {sessions && sessions.length > 1 && (
        <Button
          variant="secondary"
          onClick={handleRevokeOthers}
          disabled={revokingOthers}
        >
          {revokingOthers ? "Signing out…" : "Sign out of all other devices"}
        </Button>
      )}

      <ul className="space-y-3">
        {sessions?.map((s) => {
          const isCurrent = s.token === currentToken;
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {describeDevice(s.userAgent)}
                  </p>
                  {isCurrent && <Badge tone="accent">This device</Badge>}
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {s.ipAddress ?? "Unknown location"} · Last active{" "}
                  {formatDate(s.updatedAt)}
                </p>
              </div>
              {!isCurrent && (
                <Button
                  variant="ghost"
                  onClick={() => handleRevoke(s.token)}
                  disabled={busyToken === s.token}
                >
                  {busyToken === s.token ? "Signing out…" : "Sign out"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
