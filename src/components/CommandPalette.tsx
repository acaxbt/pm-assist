"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, MessageSquare, ArrowRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaletteThread = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type Action = {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: React.ReactNode;
  onRun: () => void;
};

type Props = {
  open: boolean;
  threads: PaletteThread[];
  onClose: () => void;
  onNewThread: () => void;
  onPickThread: (id: string) => void;
  onToggleSidebar: () => void;
  onToggleArtifact: () => void;
};

export default function CommandPalette({
  open,
  threads,
  onClose,
  onNewThread,
  onPickThread,
  onToggleSidebar,
  onToggleArtifact,
}: Props) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      // Focus on next tick to ensure input is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const actions: Action[] = useMemo(
    () => [
      {
        id: "new-thread",
        label: "Thread baru",
        hint: "Mulai PRD baru",
        shortcut: "⌘N",
        icon: <Plus className="h-3.5 w-3.5" />,
        onRun: onNewThread,
      },
      {
        id: "toggle-sidebar",
        label: "Toggle sidebar",
        shortcut: "⌘/",
        icon: <Command className="h-3.5 w-3.5" />,
        onRun: onToggleSidebar,
      },
      {
        id: "toggle-artifact",
        label: "Toggle artifact panel",
        shortcut: "⌘⇧A",
        icon: <Command className="h-3.5 w-3.5" />,
        onRun: onToggleArtifact,
      },
    ],
    [onNewThread, onToggleSidebar, onToggleArtifact]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesAction = actions.filter(
      (a) => !q || a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q)
    );
    const matchesThread = threads
      .filter((t) => !q || (t.title ?? "").toLowerCase().includes(q))
      .slice(0, 30);
    return { actions: matchesAction, threads: matchesThread };
  }, [query, actions, threads]);

  const flatItems: Array<{ type: "action" | "thread"; data: Action | PaletteThread }> = useMemo(
    () => [
      ...filtered.actions.map((a) => ({ type: "action" as const, data: a })),
      ...filtered.threads.map((t) => ({ type: "thread" as const, data: t })),
    ],
    [filtered]
  );

  useEffect(() => {
    if (highlight >= flatItems.length) setHighlight(Math.max(0, flatItems.length - 1));
  }, [flatItems, highlight]);

  function runAt(idx: number) {
    const item = flatItems[idx];
    if (!item) return;
    if (item.type === "action") {
      (item.data as Action).onRun();
    } else {
      onPickThread((item.data as PaletteThread).id);
    }
    onClose();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(highlight);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-md border border-rule bg-canvas-raised shadow-2xl animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={handleKey}
            placeholder="Cari thread atau jalankan perintah…"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <kbd className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.actions.length > 0 && (
            <Section label="Perintah">
              {filtered.actions.map((a, i) => {
                const idx = i;
                return (
                  <Row
                    key={a.id}
                    active={idx === highlight}
                    onClick={() => runAt(idx)}
                    onMouseEnter={() => setHighlight(idx)}
                    icon={a.icon}
                    label={a.label}
                    hint={a.hint}
                    trailing={a.shortcut && <Kbd text={a.shortcut} />}
                  />
                );
              })}
            </Section>
          )}

          {filtered.threads.length > 0 && (
            <Section label={`Thread (${filtered.threads.length})`}>
              {filtered.threads.map((t, i) => {
                const idx = filtered.actions.length + i;
                return (
                  <Row
                    key={t.id}
                    active={idx === highlight}
                    onClick={() => runAt(idx)}
                    onMouseEnter={() => setHighlight(idx)}
                    icon={<MessageSquare className="h-3.5 w-3.5" />}
                    label={t.title || "Untitled"}
                    hint={formatRelative(t.updatedAt)}
                    trailing={<ArrowRight className="h-3 w-3 text-ink-subtle" />}
                  />
                );
              })}
            </Section>
          )}

          {flatItems.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
              Tidak ada hasil untuk &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-rule bg-canvas-sunken px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          <span className="flex items-center gap-1">
            <Kbd text="↑↓" /> navigasi
          </span>
          <span className="flex items-center gap-1">
            <Kbd text="↵" /> pilih
          </span>
          <span className="flex items-center gap-1">
            <Kbd text="esc" /> tutup
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  active,
  onClick,
  onMouseEnter,
  icon,
  label,
  hint,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition",
        active ? "bg-canvas text-ink" : "text-ink-muted"
      )}
    >
      <span className={cn("shrink-0", active ? "text-accent" : "text-ink-subtle")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{label}</span>
        {hint && <span className="block truncate text-[11px] text-ink-subtle">{hint}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

function Kbd({ text }: { text: string }) {
  return (
    <kbd className="rounded-sm border border-rule bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
      {text}
    </kbd>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < day) return "Hari ini";
  if (diff < 2 * day) return "Kemarin";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
