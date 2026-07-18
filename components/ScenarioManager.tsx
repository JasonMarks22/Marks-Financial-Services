"use client";

/**
 * Reusable save / load / rename / delete UI for a tool's scenarios. Every tool
 * uses this one component: it supplies its `tool` key, a `getData()` snapshot of
 * its current inputs, and an `onLoad(data)` callback to apply a loaded scenario.
 * Tool-specific logic stays in the tool; this component only handles storage
 * and the shared UI.
 *
 * - Signed OUT: the Save control still shows; clicking prompts sign-in (link)
 *   and never discards the inputs already typed.
 * - Saving with a name that already exists for this tool offers Overwrite or
 *   Keep both (save as new) — never a silent duplicate.
 * - Also handles deep links: /tool?scenario=<id> loads that scenario on mount.
 *
 * Scenario contents are never logged.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createScenario,
  deleteScenario,
  getScenario,
  listScenarios,
  updateScenario,
  validateScenarioData,
  type SavedScenarioRow,
  type ToolKey,
} from "@/lib/scenarios/savedScenarios";

type Msg = { kind: "success" | "error"; text: string } | null;

export function ScenarioManager({
  tool,
  getData,
  onLoad,
  className = "",
}: {
  tool: ToolKey;
  getData: () => unknown;
  onLoad: (data: Record<string, unknown>) => void;
  className?: string;
}) {
  const { user, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<SavedScenarioRow[] | null>(null);
  const [panel, setPanel] = useState<"none" | "save" | "manage">("none");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [clash, setClash] = useState<SavedScenarioRow | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Load this tool's scenarios once we know the user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) setRows(null);
        return;
      }
      const { data, error } = await listScenarios(tool);
      if (cancelled) return;
      setRows(data);
      if (error) setMsg({ kind: "error", text: `Couldn't load saved: ${error}` });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tool]);

  // Deep link: ?scenario=<id> loads that scenario into the tool (once).
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("scenario");
    if (!id) return;
    let cancelled = false;
    getScenario(id).then(({ data, error }) => {
      if (cancelled || !data) {
        if (error) setMsg({ kind: "error", text: `Couldn't open scenario: ${error}` });
        return;
      }
      if (data.tool !== tool) return; // belongs to a different tool
      onLoad(validateScenarioData(tool, data.data));
      setMsg({ kind: "success", text: `Loaded “${data.name}”.` });
    });
    return () => {
      cancelled = true;
    };
    // Run once on mount for a signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function openSave() {
    setPanel(panel === "save" ? "none" : "save");
    setMsg(null);
    setClash(null);
    setName("");
  }
  function openManage() {
    setPanel(panel === "manage" ? "none" : "manage");
    setMsg(null);
  }

  async function doCreate(scenarioName: string) {
    setBusy(true);
    const { data, error } = await createScenario(tool, scenarioName, getData());
    setBusy(false);
    if (error || !data) {
      setMsg({ kind: "error", text: `Couldn't save: ${error ?? "unknown error"}` });
      return;
    }
    setRows((prev) => [data, ...(prev ?? [])]);
    setMsg({ kind: "success", text: `Saved “${scenarioName}”.` });
    setPanel("none");
    setName("");
    setClash(null);
  }

  async function doOverwrite(existing: SavedScenarioRow) {
    setBusy(true);
    const { error } = await updateScenario(existing.id, { data: getData() });
    setBusy(false);
    if (error) {
      setMsg({ kind: "error", text: `Couldn't overwrite: ${error}` });
      return;
    }
    setRows((prev) =>
      (prev ?? []).map((r) =>
        r.id === existing.id
          ? { ...r, updated_at: new Date().toISOString() }
          : r,
      ),
    );
    setMsg({ kind: "success", text: `Updated “${existing.name}”.` });
    setPanel("none");
    setName("");
    setClash(null);
  }

  function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = (rows ?? []).find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      setClash(existing); // ask overwrite vs keep both
      return;
    }
    doCreate(trimmed);
  }

  async function handleLoad(row: SavedScenarioRow) {
    onLoad(validateScenarioData(tool, row.data));
    setMsg({ kind: "success", text: `Loaded “${row.name}”.` });
    setPanel("none");
  }

  async function handleDelete(row: SavedScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteScenario(row.id);
    if (error) {
      setMsg({ kind: "error", text: `Couldn't delete: ${error}` });
      return;
    }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
    setMsg({ kind: "success", text: `Deleted “${row.name}”.` });
  }

  async function handleRename(row: SavedScenarioRow) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const { error } = await updateScenario(row.id, { name: trimmed });
    if (error) {
      setMsg({ kind: "error", text: `Couldn't rename: ${error}` });
      return;
    }
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === row.id ? { ...r, name: trimmed } : r)),
    );
    setRenaming(null);
    setRenameValue("");
    setMsg({ kind: "success", text: `Renamed to “${trimmed}”.` });
  }

  if (authLoading) return null;

  // ── Signed out: show the control, prompt sign-in on use ────────────────
  if (!user) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => setMsg({ kind: "error", text: "sign-in-required" })}
          className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-link transition hover:border-accent"
        >
          Save scenario
        </button>
        {msg?.text === "sign-in-required" && (
          <p className="text-xs text-muted">
            <Link
              href="/login"
              className="font-semibold text-link underline underline-offset-2"
            >
              Log in
            </Link>{" "}
            to save this scenario. Your inputs stay as they are.
          </p>
        )}
      </div>
    );
  }

  const count = rows?.length ?? 0;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={openSave}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
        >
          Save scenario
        </button>
        <button
          type="button"
          onClick={openManage}
          className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-link transition hover:border-accent"
        >
          Saved ({count})
        </button>
      </div>

      {/* Save panel */}
      {panel === "save" && (
        <div className="w-full max-w-sm rounded-xl border border-edge bg-card p-4 shadow-soft">
          {!clash ? (
            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted">
                Name this scenario
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Base case"
                  maxLength={200}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
                />
                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-neutral-700">
                A scenario named{" "}
                <span className="font-semibold text-ink">“{clash.name}”</span>{" "}
                already exists.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => doOverwrite(clash)}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Overwrite
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => doCreate(name.trim())}
                  className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-link disabled:opacity-50"
                >
                  Keep both
                </button>
                <button
                  type="button"
                  onClick={() => setClash(null)}
                  className="px-2 py-1.5 text-xs text-muted hover:text-neutral-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manage panel */}
      {panel === "manage" && (
        <div className="w-full max-w-md rounded-xl border border-edge bg-card p-4 shadow-soft">
          {rows === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted">
              No saved scenarios yet. Save one above to see it here.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-2 py-2">
                  {renaming === row.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRename(row);
                      }}
                      className="flex flex-1 gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        maxLength={200}
                        className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                      />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-link"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(null)}
                        className="text-xs text-muted"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {row.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          Updated {new Date(row.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoad(row)}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(row.id);
                          setRenameValue(row.name);
                        }}
                        className="rounded-full border border-edge px-3 py-1 text-xs font-medium text-neutral-600 hover:border-accent"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="rounded-full border border-edge px-3 py-1 text-xs font-medium text-neutral-600 hover:border-red-300 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {msg && msg.text !== "sign-in-required" && (
        <p
          className={`text-xs ${
            msg.kind === "error" ? "text-red-600" : "text-muted"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
