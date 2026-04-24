"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  title: string | null;
  model: string | null;
  updatedAt: string;
  _count: { messages: number };
};

type Props = {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  refreshKey: number;
  userEmail: string;
};

export default function Sidebar({ activeId, onSelect, refreshKey, userEmail }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setConvs(d);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [refreshKey]);

  async function deleteConv(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Hapus thread ini?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConvs((c) => c.filter((x) => x.id !== id));
    if (activeId === id) onSelect(null);
  }

  const grouped = groupByDate(convs);

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-rule bg-canvas-sunken">
      {/* Brand */}
      <div className="border-b border-rule px-5 pb-4 pt-5">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-medium tracking-tightest text-ink">
            Pressroom
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            v0.1
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          PRD Studio · Detik
        </p>
      </div>

      {/* New thread */}
      <div className="space-y-1.5 px-3 py-3">
        <button
          onClick={() => onSelect(null)}
          className="group flex w-full items-center gap-2 rounded-sm border border-rule bg-canvas-raised px-3 py-2 text-sm font-medium text-ink transition hover:border-ink hover:bg-canvas"
        >
          <Plus className="h-3.5 w-3.5 transition group-hover:rotate-90" />
          <span>Thread baru</span>
          <kbd className="ml-auto font-mono text-[10px] text-ink-subtle">⌘N</kbd>
        </button>
        <button
          onClick={() => {
            // Dispatch synthetic ⌘K to open palette via global listener
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
            );
          }}
          className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs text-ink-muted transition hover:bg-canvas hover:text-ink"
        >
          <span>Cari thread / perintah</span>
          <kbd className="ml-auto font-mono text-[10px] text-ink-subtle">⌘K</kbd>
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ink-subtle">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : convs.length === 0 ? (
          <div className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
            Belum ada thread
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="mb-1 px-3 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                  {group.label}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          "group flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm transition",
                          activeId === c.id
                            ? "bg-canvas text-ink shadow-[inset_2px_0_0_rgb(var(--accent))]"
                            : "text-ink-muted hover:bg-canvas hover:text-ink"
                        )}
                      >
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                        <span className="line-clamp-2 flex-1 leading-snug">
                          {c.title || "Untitled"}
                        </span>
                        <button
                          onClick={(e) => deleteConv(c.id, e)}
                          className="invisible -mr-1 mt-0.5 rounded p-0.5 text-ink-subtle opacity-0 transition hover:bg-canvas-sunken hover:text-accent group-hover:visible group-hover:opacity-100"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User strip */}
      <div className="border-t border-rule px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold uppercase text-accent-fg">
            {userEmail[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-ink">{userEmail}</div>
            <form action="/api/auth/signout" method="post" className="inline">
              <button className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle hover:text-accent">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

function groupByDate(convs: Conversation[]) {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const groups: Record<string, Conversation[]> = {
    "Hari ini": [],
    "Kemarin": [],
    "7 hari terakhir": [],
    "Lebih lama": [],
  };
  for (const c of convs) {
    const age = now - new Date(c.updatedAt).getTime();
    if (age < day) groups["Hari ini"].push(c);
    else if (age < 2 * day) groups["Kemarin"].push(c);
    else if (age < 7 * day) groups["7 hari terakhir"].push(c);
    else groups["Lebih lama"].push(c);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
