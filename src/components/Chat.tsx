"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Square,
  Sparkles,
  Zap,
  FileText,
  PanelRight,
  Pencil,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseMessage, type Artifact, type Segment } from "@/lib/extract-artifact";
import ArtifactCard from "./ArtifactCard";
import ClarifyCard from "./ClarifyCard";

type Props = {
  conversationId: string | null;
  instanceKey: number;
  onConversationCreated: (id: string) => void;
  onArtifactsChange: (artifacts: Artifact[]) => void;
  onOpenArtifact: (id: string) => void;
  activeArtifactId: string | null;
  panelOpen: boolean;
  onTogglePanel: () => void;
};

export default function Chat({
  conversationId,
  instanceKey,
  onConversationCreated,
  onArtifactsChange,
  onOpenArtifact,
  activeArtifactId,
  panelOpen,
  onTogglePanel,
}: Props) {
  const [model, setModel] = useState<"default" | "premium">("default");
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportedConvId = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setInitialMessages([]);
      reportedConvId.current = null;
      return;
    }
    // If this conversation id was just adopted from a streaming response
    // (we created it client-side), don't refetch — it would overwrite live state.
    if (reportedConvId.current === conversationId) {
      return;
    }
    setLoadingHistory(true);
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((d) => {
        const msgs: Message[] = (d.messages ?? [])
          .filter((m: { role: string }) => m.role === "USER" || m.role === "ASSISTANT")
          .map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
            createdAt: new Date(m.createdAt),
          }));
        setInitialMessages(msgs);
        reportedConvId.current = conversationId;
      })
      .finally(() => setLoadingHistory(false));
  }, [conversationId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setInput,
    setMessages,
    reload,
    append,
  } = useChat({
    api: "/api/chat",
    id: conversationId ?? `new-${instanceKey}`,
    initialMessages,
    body: { model, conversationId },
    onResponse: (res) => {
      const newId = res.headers.get("X-Conversation-Id");
      if (newId && newId !== reportedConvId.current) {
        reportedConvId.current = newId;
        onConversationCreated(newId);
      }
    },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isLoading]);

  function handleEditUserMessage(messageId: string, newContent: string) {
    if (isLoading) stop();
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    // Truncate everything from this user message onward, then re-send via append.
    setMessages(messages.slice(0, idx));
    void append({ role: "user", content: newContent });
  }

  function handleRegenerateAssistant(messageId: string) {
    if (isLoading) stop();
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    // Drop the assistant message (and anything after); reload regenerates the last assistant turn.
    setMessages(messages.slice(0, idx));
    void reload();
  }

  function handleClarifySubmit(formatted: string) {
    if (isLoading) return;
    void append({ role: "user", content: formatted });
  }

  // Parse all assistant messages into segments + collect artifacts
  const parsed = useMemo(() => {
    const allArtifacts: Artifact[] = [];
    const messageSegments = new Map<string, Segment[]>();
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const segs = parseMessage(m.id, m.content);
      messageSegments.set(m.id, segs);
      for (const s of segs) if (s.kind === "artifact") allArtifacts.push(s.artifact);
    }
    return { allArtifacts, messageSegments };
  }, [messages]);

  useEffect(() => {
    onArtifactsChange(parsed.allArtifacts);
  }, [parsed.allArtifacts, onArtifactsChange]);

  const showEmpty = messages.length === 0 && !loadingHistory;
  const hasArtifacts = parsed.allArtifacts.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-canvas-grain">
      <header className="flex items-center justify-between border-b border-rule px-6 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-serif text-base font-medium text-ink">
            {conversationId && messages.length > 0 ? "Thread" : "Mulai PRD baru"}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            {messages.length > 0 ? `${messages.length} pesan` : "kosong"}
            {hasArtifacts && ` · ${parsed.allArtifacts.length} artifact`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasArtifacts && !panelOpen && (
            <button
              onClick={onTogglePanel}
              className="flex items-center gap-1.5 rounded-sm border border-rule bg-canvas-raised px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition hover:border-ink hover:text-ink"
              title="Buka panel artifact"
            >
              <PanelRight className="h-3 w-3" />
              Artifact
            </button>
          )}
          <ModelToggle value={model} onChange={setModel} />
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {showEmpty ? (
          <EmptyState onPick={(s) => setInput(s)} />
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-8">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const streaming = isLoading && isLast && m.role === "assistant";
              return (
                <MessageBlock
                  key={m.id}
                  message={m}
                  segments={parsed.messageSegments.get(m.id)}
                  streaming={streaming}
                  busy={isLoading}
                  isLastAssistant={isLast && m.role === "assistant"}
                  activeArtifactId={activeArtifactId}
                  onOpenArtifact={onOpenArtifact}
                  onEdit={handleEditUserMessage}
                  onRegenerate={handleRegenerateAssistant}
                  onClarifySubmit={handleClarifySubmit}
                />
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === "user" && <ThinkingBubble />}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-rule bg-canvas-raised px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="group relative rounded-md border border-rule bg-canvas transition focus-within:border-ink">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Cerita ide kamu — masalah apa, untuk siapa, kenapa sekarang…"
              rows={3}
              className="block w-full resize-none rounded-md bg-transparent px-4 py-3 pr-14 text-[15px] leading-relaxed text-ink placeholder:text-ink-subtle focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                }
              }}
            />
            <div className="absolute bottom-2 right-2">
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-canvas hover:bg-accent"
                  aria-label="Stop"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-accent-fg transition hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                  aria-label="Kirim"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            <span>
              {model === "premium" ? "Claude Sonnet 4.6" : "Gemini 3 Flash"} ·{" "}
              <span className="text-ink-muted">temp 0.4</span>
            </span>
            <span>⌘+Enter untuk kirim</span>
          </div>
        </div>
      </form>
    </div>
  );
}

function ModelToggle({
  value,
  onChange,
}: {
  value: "default" | "premium";
  onChange: (v: "default" | "premium") => void;
}) {
  return (
    <div className="flex rounded-sm border border-rule bg-canvas-raised p-0.5 font-mono text-[10px] uppercase tracking-wider">
      <button
        onClick={() => onChange("default")}
        className={cn(
          "flex items-center gap-1 rounded-sm px-2.5 py-1 transition",
          value === "default" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
        )}
      >
        <Zap className="h-2.5 w-2.5" />
        Fast
      </button>
      <button
        onClick={() => onChange("premium")}
        className={cn(
          "flex items-center gap-1 rounded-sm px-2.5 py-1 transition",
          value === "premium" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
        )}
      >
        <Sparkles className="h-2.5 w-2.5" />
        Premium
      </button>
    </div>
  );
}

function MessageBlock({
  message,
  segments,
  streaming,
  busy,
  isLastAssistant,
  activeArtifactId,
  onOpenArtifact,
  onEdit,
  onRegenerate,
  onClarifySubmit,
}: {
  message: Message;
  segments: Segment[] | undefined;
  streaming: boolean;
  busy: boolean;
  isLastAssistant: boolean;
  activeArtifactId: string | null;
  onOpenArtifact: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onRegenerate: (id: string) => void;
  onClarifySubmit: (formatted: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (message.role === "user") {
    if (editing) {
      return (
        <div className="mb-8 animate-rise">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            Edit pesan
          </div>
          <div className="rounded-sm border border-accent bg-canvas-raised">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.max(3, draft.split("\n").length)}
              className="block w-full resize-none rounded-sm bg-transparent px-4 py-3 text-[15px] leading-relaxed text-ink focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (draft.trim() && draft !== message.content) {
                    onEdit(message.id, draft.trim());
                  }
                  setEditing(false);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setDraft(message.content);
                  setEditing(false);
                }
              }}
            />
            <div className="flex items-center justify-between border-t border-rule px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                ⌘+Enter simpan & re-run · Esc batal
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                  className="rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
                >
                  Batal
                </button>
                <button
                  disabled={!draft.trim() || draft === message.content}
                  onClick={() => {
                    onEdit(message.id, draft.trim());
                    setEditing(false);
                  }}
                  className="rounded-sm bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-fg transition hover:bg-ink disabled:opacity-30"
                >
                  Simpan & re-run
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group/msg mb-8 animate-rise">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            Kamu
          </span>
          <div className="flex gap-0.5 opacity-0 transition group-hover/msg:opacity-100">
            <IconButton
              label={copied ? "Tersalin" : "Salin"}
              onClick={copyMessage}
              icon={copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
            />
            <IconButton
              label="Edit & re-run"
              onClick={() => {
                setDraft(message.content);
                setEditing(true);
              }}
              disabled={busy}
              icon={<Pencil className="h-3 w-3" />}
            />
          </div>
        </div>
        <div className="rounded-sm border-l-2 border-ink bg-canvas-raised px-4 py-3 text-[15px] leading-relaxed text-ink">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Detect "still streaming an artifact" — there's an unclosed <artifact tag
  const streamingArtifact = streaming && /<artifact\b[^>]*>(?![\s\S]*<\/artifact>)/i.test(message.content);

  return (
    <div className="group/msg mb-10 animate-rise">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          <span className="inline-block h-1 w-1 rounded-full bg-accent" />
          PRD Assistant
        </span>
        {!streaming && (
          <div className="flex gap-0.5 opacity-0 transition group-hover/msg:opacity-100">
            <IconButton
              label={copied ? "Tersalin" : "Salin"}
              onClick={copyMessage}
              icon={copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
            />
            <IconButton
              label="Regenerate"
              onClick={() => onRegenerate(message.id)}
              disabled={busy}
              icon={<RefreshCw className="h-3 w-3" />}
            />
          </div>
        )}
      </div>
      {segments && segments.length > 0 ? (
        <div>
          {segments.map((seg, idx) => {
            if (seg.kind === "artifact") {
              return (
                <ArtifactCard
                  key={seg.artifact.id}
                  artifact={seg.artifact}
                  active={seg.artifact.id === activeArtifactId}
                  streaming={streamingArtifact && idx === segments.length - 1}
                  onOpen={onOpenArtifact}
                />
              );
            }
            if (seg.kind === "clarify") {
              return (
                <ClarifyCard
                  key={seg.clarify.id}
                  block={seg.clarify}
                  active={isLastAssistant && !busy}
                  onSubmit={onClarifySubmit}
                />
              );
            }
            return (
              <div
                key={`text-${idx}`}
                className={cn(
                  "prose-prd",
                  streaming && idx === segments.length - 1 && !streamingArtifact && "cursor-blink"
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.content}</ReactMarkdown>
              </div>
            );
          })}
          {/* Placeholder card when artifact tag opened but content not yet finished */}
          {streamingArtifact && segments[segments.length - 1]?.kind !== "artifact" && (
            <div className="my-3 flex items-center gap-2 rounded-sm border border-dashed border-accent bg-canvas-raised px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-accent">
              <FileText className="h-3.5 w-3.5 animate-pulse" />
              menulis artifact…
            </div>
          )}
        </div>
      ) : (
        // Fallback: show raw while parser hasn't kicked in yet
        <div className={cn("prose-prd", streaming && "cursor-blink")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="mb-10 animate-rise">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-accent" />
        PRD Assistant
      </div>
      <div className="flex gap-1 py-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-subtle [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-subtle [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-subtle" />
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const prompts = [
    {
      tag: "FEATURE",
      text: "Fitur smart digest notification — gantikan push harian dengan rangkuman pagi personalized untuk tiap user.",
    },
    {
      tag: "EXPERIMENT",
      text: "Eksperimen A/B headline AI-generated vs editor untuk artikel olahraga selama 2 minggu.",
    },
    {
      tag: "REFINE",
      text: "Critique PRD ini dan kasih saran perbaikan: …",
    },
    {
      tag: "EXTRACT",
      text: "Ekstrak user stories dari deskripsi ini, format siap-paste ke Plane: …",
    },
  ];
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-10 animate-rise">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
          <span className="h-px w-6 bg-accent" />
          {today} · Edisi pagi
        </div>
        <h1 className="font-serif text-[44px] font-medium leading-[1.05] tracking-tightest text-ink">
          Tulis PRD seperti
          <br />
          menulis untuk halaman muka.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted">
          Ceritakan ide kamu dalam bahasa biasa — masalahnya, untuk siapa, kenapa
          sekarang. Asisten akan mendraft PRD lengkap, langsung. Bukan menanyaimu
          balik seperti wartawan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((p, i) => (
          <button
            key={p.tag}
            onClick={() => onPick(p.text)}
            className="group flex animate-rise flex-col items-start gap-2 rounded-sm border border-rule bg-canvas-raised p-4 text-left transition hover:border-ink hover:bg-canvas"
            style={{ animationDelay: `${100 + i * 60}ms` }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
              {p.tag}
            </span>
            <span className="text-[13.5px] leading-snug text-ink-muted group-hover:text-ink">
              {p.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-subtle transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-subtle"
    >
      {icon}
    </button>
  );
}
