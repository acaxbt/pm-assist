"use client";

import { FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Artifact } from "@/lib/extract-artifact";

type Props = {
  artifact: Artifact;
  active: boolean;
  streaming?: boolean;
  onOpen: (id: string) => void;
};

export default function ArtifactCard({ artifact, active, streaming, onOpen }: Props) {
  const wordCount = artifact.content.trim().split(/\s+/).filter(Boolean).length;
  const sectionCount = (artifact.content.match(/^##\s+/gm) ?? []).length;

  return (
    <button
      onClick={() => onOpen(artifact.id)}
      className={cn(
        "group my-3 flex w-full items-stretch gap-0 overflow-hidden rounded-sm border bg-canvas-raised text-left transition",
        active
          ? "border-ink shadow-[0_0_0_1px_rgb(var(--ink))]"
          : "border-rule hover:border-ink"
      )}
    >
      {/* Left rail with icon */}
      <div
        className={cn(
          "flex w-12 shrink-0 items-center justify-center border-r transition",
          active
            ? "border-ink bg-accent text-accent-fg"
            : "border-rule bg-canvas-sunken text-ink-muted group-hover:text-ink"
        )}
      >
        <FileText className="h-4 w-4" />
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
              Artifact · {artifact.version}
            </span>
            {streaming && (
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                <span className="h-1 w-1 animate-pulse rounded-full bg-accent" />
                menulis
              </span>
            )}
          </div>
          <div className="truncate font-serif text-[15px] font-medium leading-tight text-ink">
            {artifact.title}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            {sectionCount} section · {wordCount.toLocaleString("id-ID")} kata
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition",
            active ? "text-accent" : "text-ink-subtle group-hover:translate-x-0.5 group-hover:text-ink"
          )}
        />
      </div>
    </button>
  );
}
