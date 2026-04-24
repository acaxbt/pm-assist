"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Download, X, Check, FileText, ChevronDown } from "lucide-react";
import type { Artifact } from "@/lib/extract-artifact";
import { cn } from "@/lib/utils";
import { markdownToPlainText } from "@/lib/markdown-to-text";

type Props = {
  artifacts: Artifact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function ArtifactPanel({ artifacts, activeId, onSelect, onClose }: Props) {
  const [copied, setCopied] = useState<"md" | "txt" | null>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const active = artifacts.find((a) => a.id === activeId) ?? artifacts[artifacts.length - 1];

  // Close copy menu when clicking outside
  useEffect(() => {
    if (!copyMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [copyMenuOpen]);

  if (!active) return null;

  const sameTitle = artifacts.filter((a) => a.title === active.title);
  const versionIdx = sameTitle.findIndex((a) => a.id === active.id);

  async function copyAs(format: "md" | "txt") {
    if (!active) return;
    const text = format === "md" ? active.content : markdownToPlainText(active.content);
    await navigator.clipboard.writeText(text);
    setCopied(format);
    setCopyMenuOpen(false);
    setTimeout(() => setCopied(null), 1800);
  }

  function download() {
    const blob = new Blob([active.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(active.title)}-${active.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const wordCount = active.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <aside className="flex h-full w-full flex-col border-l border-rule bg-canvas-raised animate-rise">
      <header className="border-b border-rule">
        <div className="flex items-center justify-between px-5 pb-2 pt-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-accent/10 text-accent">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                Artifact · {active.version}
                {sameTitle.length > 1 && ` · v${versionIdx + 1}/${sameTitle.length}`}
              </div>
              <h3 className="truncate font-serif text-[15px] font-medium leading-tight text-ink">
                {active.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div ref={copyMenuRef} className="relative">
              <button
                onClick={() => setCopyMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-sm border border-rule px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition hover:border-ink hover:text-ink"
                title="Copy"
              >
                {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                {copied === "md" ? "Copied md" : copied === "txt" ? "Copied text" : "Copy"}
                <ChevronDown className={cn("h-3 w-3 transition", copyMenuOpen && "rotate-180")} />
              </button>
              {copyMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-sm border border-rule bg-canvas-raised shadow-lg">
                  <button
                    onClick={() => copyAs("md")}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-canvas"
                  >
                    <Copy className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted" />
                    <span className="flex-1">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-ink">
                        Copy as Markdown
                      </span>
                      <span className="block text-[10px] text-ink-subtle">
                        # heading, **bold**, tabel
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => copyAs("txt")}
                    className="flex w-full items-start gap-2 border-t border-rule/60 px-3 py-2 text-left transition hover:bg-canvas"
                  >
                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted" />
                    <span className="flex-1">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-ink">
                        Copy as Plain text
                      </span>
                      <span className="block text-[10px] text-ink-subtle">
                        Untuk Slack / email / Notion
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={download}
              className="flex items-center gap-1.5 rounded-sm border border-rule px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition hover:border-ink hover:text-ink"
              title="Download .md"
            >
              <Download className="h-3 w-3" />
              .md
            </button>
            <button
              onClick={onClose}
              className="ml-1 rounded-sm p-1.5 text-ink-subtle transition hover:bg-canvas-sunken hover:text-ink"
              aria-label="Tutup panel"
              title="Tutup panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {artifacts.length > 1 && (
          <div className="border-t border-rule/60 px-5 py-2">
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex w-full items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink"
            >
              <ChevronDown className={cn("h-3 w-3 transition", showHistory && "rotate-180")} />
              {artifacts.length} artifacts di thread ini
            </button>
            {showHistory && (
              <ul className="mt-2 space-y-0.5">
                {artifacts.map((a, i) => (
                  <li key={a.id}>
                    <button
                      onClick={() => onSelect(a.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition",
                        a.id === active.id
                          ? "bg-canvas text-ink"
                          : "text-ink-muted hover:bg-canvas hover:text-ink"
                      )}
                    >
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate">{a.title}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                        {a.version}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <div className="mb-8 border-b-2 border-ink pb-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                Detik · Product Memo
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                {wordCount.toLocaleString("id-ID")} kata
              </span>
            </div>
          </div>
          <article className="prose-prd">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
          </article>
        </div>
      </div>
    </aside>
  );
}

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "prd"
  );
}
