"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chat from "@/components/Chat";
import ArtifactPanel from "@/components/ArtifactPanel";
import ResizeHandle from "@/components/ResizeHandle";
import CommandPalette, { type PaletteThread } from "@/components/CommandPalette";
import { PanelLeft } from "lucide-react";
import type { Artifact } from "@/lib/extract-artifact";

const PANEL_DEFAULT = 560;
const PANEL_MIN = 380;
const PANEL_STORAGE_KEY = "pressroom:panelWidth";

export default function ChatShell({ userEmail }: { userEmail: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatInstanceKey, setChatInstanceKey] = useState(0);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteThreads, setPaletteThreads] = useState<PaletteThread[]>([]);

  // Load saved width on mount
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (saved) {
      const w = parseInt(saved, 10);
      if (!Number.isNaN(w)) setPanelWidth(clampWidth(w));
    }
  }, []);

  const handleResize = useCallback((delta: number) => {
    setPanelWidth((w) => {
      const next = clampWidth(w - delta);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PANEL_STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const resetPanelWidth = useCallback(() => {
    setPanelWidth(PANEL_DEFAULT);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(PANEL_DEFAULT));
    }
  }, []);

  // Track last seen artifact count so we auto-open panel when a NEW one appears
  const prevCountRef = useRef(0);
  const prevLastIdRef = useRef<string | null>(null);

  function handleSelect(id: string | null) {
    setActiveId(id);
    setChatInstanceKey((k) => k + 1);
    setArtifacts([]);
    setActiveArtifactId(null);
    setPanelOpen(false);
    prevCountRef.current = 0;
    prevLastIdRef.current = null;
  }

  function handleConversationCreated(id: string) {
    setActiveId(id);
    setRefreshKey((k) => k + 1);
  }

  const handleArtifactsChange = useCallback((next: Artifact[]) => {
    setArtifacts(next);
    const lastId = next[next.length - 1]?.id ?? null;
    const isNewArtifact = lastId !== null && lastId !== prevLastIdRef.current;
    if (isNewArtifact) {
      // Auto-select newest, auto-open panel only if count increased
      setActiveArtifactId(lastId);
      if (next.length > prevCountRef.current) setPanelOpen(true);
    }
    prevLastIdRef.current = lastId;
    prevCountRef.current = next.length;
  }, []);

  function handleOpenArtifact(id: string) {
    setActiveArtifactId(id);
    setPanelOpen(true);
  }

  function handleClosePanel() {
    setPanelOpen(false);
  }

  function handleTogglePanel() {
    if (!panelOpen && !activeArtifactId && artifacts.length > 0) {
      setActiveArtifactId(artifacts[artifacts.length - 1].id);
    }
    setPanelOpen((p) => !p);
  }

  // Reset artifacts state when thread changes (handled in handleSelect already)
  useEffect(() => {
    if (!activeId) {
      setArtifacts([]);
      setActiveArtifactId(null);
      setPanelOpen(false);
    }
  }, [activeId]);

  // Fetch threads list for command palette when opened
  useEffect(() => {
    if (!paletteOpen) return;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setPaletteThreads(data))
      .catch(() => {});
  }, [paletteOpen, refreshKey]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      // Ignore if typing in input/textarea (except the modifier-bound ones below)
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      if (mod && e.key.toLowerCase() === "n" && !inField) {
        e.preventDefault();
        handleSelect(null);
        return;
      }
      if (mod && e.key === "/" && !inField) {
        e.preventDefault();
        setSidebarOpen((s) => !s);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleTogglePanel();
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) {
          // CommandPalette handles its own Esc when focused
          return;
        }
        if (panelOpen) {
          e.preventDefault();
          setPanelOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen, panelOpen, artifacts, activeArtifactId]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          activeId={activeId}
          onSelect={handleSelect}
          refreshKey={refreshKey}
          userEmail={userEmail}
        />
      )}
      <main className="relative flex flex-1 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Buka sidebar (⌘/)"
            aria-label="Buka sidebar"
            className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm border border-rule bg-canvas-raised text-ink-muted shadow-sm transition hover:border-ink hover:text-ink"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex flex-1 flex-col">
          <Chat
            key={`chat-${chatInstanceKey}`}
            conversationId={activeId}
            instanceKey={chatInstanceKey}
            onConversationCreated={handleConversationCreated}
            onArtifactsChange={handleArtifactsChange}
            onOpenArtifact={handleOpenArtifact}
            activeArtifactId={panelOpen ? activeArtifactId : null}
            panelOpen={panelOpen}
            onTogglePanel={handleTogglePanel}
          />
        </div>
        {panelOpen && artifacts.length > 0 && (
          <>
            <ResizeHandle onResize={handleResize} onDoubleClick={resetPanelWidth} />
            <div className="shrink-0" style={{ width: panelWidth }}>
              <ArtifactPanel
                artifacts={artifacts}
                activeId={activeArtifactId}
                onSelect={setActiveArtifactId}
                onClose={handleClosePanel}
              />
            </div>
          </>
        )}
      </main>
      <CommandPalette
        open={paletteOpen}
        threads={paletteThreads}
        onClose={() => setPaletteOpen(false)}
        onNewThread={() => handleSelect(null)}
        onPickThread={(id) => handleSelect(id)}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onToggleArtifact={handleTogglePanel}
      />
    </div>
  );
}

function clampWidth(w: number): number {
  if (typeof window === "undefined") return w;
  const max = Math.max(PANEL_MIN, window.innerWidth - 600);
  return Math.min(Math.max(w, PANEL_MIN), max);
}
