"use client";

/**
 * "My saved scenarios" page.
 *
 * Logged out → friendly invite to log in (nothing blocked). Logged in → every
 * saved scenario across all tools, from one query, grouped by tool and
 * filterable, with Open (deep-links into the tool with the scenario loaded),
 * Rename, and Delete. All rows are the user's own (RLS enforces it).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/ui/Disclaimer";
import {
  deleteScenario,
  listScenarios,
  updateScenario,
  validateScenarioData,
  TOOL_KEYS,
  TOOL_META,
  type SavedScenarioRow,
  type ToolKey,
} from "@/lib/scenarios/savedScenarios";

export default function ScenariosPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<SavedScenarioRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ToolKey | "all">("all");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) setRows(null);
        return;
      }
      const { data, error } = await listScenarios();
      if (cancelled) return;
      setRows(data);
      setError(error);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Which tools the user actually has scenarios for (for the filter chips).
  const toolsPresent = useMemo(() => {
    const set = new Set<ToolKey>();
    for (const r of rows ?? []) set.add(r.tool);
    return TOOL_KEYS.filter((t) => set.has(t));
  }, [rows]);

  const visibleByTool = useMemo(() => {
    const map = new Map<ToolKey, SavedScenarioRow[]>();
    for (const r of rows ?? []) {
      if (filter !== "all" && r.tool !== filter) continue;
      const list = map.get(r.tool) ?? [];
      list.push(r);
      map.set(r.tool, list);
    }
    return map;
  }, [rows, filter]);

  async function handleDelete(row: SavedScenarioRow) {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    const { error } = await deleteScenario(row.id);
    if (error) {
      setError(`Couldn't delete: ${error}`);
      return;
    }
    setRows((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
  }

  async function handleRename(row: SavedScenarioRow) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const { error } = await updateScenario(row.id, { name: trimmed });
    if (error) {
      setError(`Couldn't rename: ${error}`);
      return;
    }
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === row.id ? { ...r, name: trimmed } : r)) : prev,
    );
    setRenaming(null);
    setRenameValue("");
  }

  return (
    <main className="flex-1 bg-surface">
      <Container className="py-14 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
          My saved scenarios
        </h1>

        {loading ? null : !user ? (
          <div className="mt-8 max-w-lg rounded-2xl border border-edge bg-card p-8 text-center shadow-soft">
            <p className="text-muted">Saved scenarios live with your account.</p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white"
            >
              Log in to see yours
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            {rows === null ? (
              <p className="mt-8 text-sm text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="mt-8 max-w-xl rounded-2xl border border-dashed border-edge p-8 text-center text-sm text-muted">
                No saved scenarios yet. Use any calculator or tool and hit{" "}
                <span className="font-semibold text-ink">Save scenario</span> to
                see it here.
              </p>
            ) : (
              <>
                {/* Filter chips */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <FilterChip
                    active={filter === "all"}
                    onClick={() => setFilter("all")}
                    label={`All (${rows.length})`}
                  />
                  {toolsPresent.map((t) => (
                    <FilterChip
                      key={t}
                      active={filter === t}
                      onClick={() => setFilter(t)}
                      label={TOOL_META[t].label}
                    />
                  ))}
                </div>

                {/* Grouped sections */}
                <div className="mt-8 space-y-10">
                  {TOOL_KEYS.filter((t) => (visibleByTool.get(t)?.length ?? 0) > 0).map(
                    (tool) => {
                      const meta = TOOL_META[tool];
                      const items = visibleByTool.get(tool)!;
                      return (
                        <section key={tool}>
                          <h2 className="text-lg font-bold text-link">
                            {meta.label}
                          </h2>
                          <ul className="mt-4 space-y-3">
                            {items.map((row) => (
                              <li
                                key={row.id}
                                className="flex flex-col gap-3 rounded-2xl border border-edge bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  {renaming === row.id ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        handleRename(row);
                                      }}
                                      className="flex gap-2"
                                    >
                                      <input
                                        type="text"
                                        autoFocus
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        maxLength={200}
                                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
                                      />
                                      <button
                                        type="submit"
                                        className="text-sm font-semibold text-link"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRenaming(null)}
                                        className="text-sm text-muted"
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  ) : (
                                    <>
                                      <p className="truncate font-medium text-ink">
                                        {row.name}
                                      </p>
                                      <p className="mt-0.5 truncate text-sm text-muted">
                                        {meta.summarize(
                                          validateScenarioData(tool, row.data),
                                        )}
                                      </p>
                                      <p className="mt-0.5 text-xs text-neutral-400">
                                        Updated{" "}
                                        {new Date(
                                          row.updated_at,
                                        ).toLocaleDateString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Link
                                    href={`${meta.path}?scenario=${row.id}`}
                                    className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white"
                                  >
                                    Open
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenaming(row.id);
                                      setRenameValue(row.name);
                                    }}
                                    className="rounded-full border border-edge px-4 py-1.5 text-sm font-medium text-neutral-600 hover:border-accent"
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(row)}
                                    className="rounded-full border border-edge px-4 py-1.5 text-sm font-medium text-neutral-600 hover:border-red-300 hover:text-red-600"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      );
                    },
                  )}
                </div>
              </>
            )}

            <div className="mt-12">
              <Disclaimer />
            </div>
          </>
        )}
      </Container>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-accent bg-accent/15 text-link"
          : "border-edge text-neutral-600 hover:border-accent hover:text-link"
      }`}
    >
      {label}
    </button>
  );
}
