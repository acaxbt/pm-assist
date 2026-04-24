"use client";

import { useState } from "react";
import { Check, ArrowRight, SkipForward, Loader2 } from "lucide-react";
import type { ClarifyBlock } from "@/lib/extract-artifact";
import { cn } from "@/lib/utils";

type Props = {
  block: ClarifyBlock;
  /** True if this is the latest assistant message and chat is not waiting for AI */
  active: boolean;
  onSubmit: (formattedAnswer: string) => void;
};

type Answers = Record<
  string,
  { selected: Set<string>; other: string }
>;

export default function ClarifyCard({ block, active, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const init: Answers = {};
    for (const q of block.questions) init[q.id] = { selected: new Set(), other: "" };
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  if (block.streaming) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-sm border border-dashed border-accent bg-canvas-raised px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-accent">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        menyiapkan pertanyaan klarifikasi…
      </div>
    );
  }

  function toggle(qid: string, opt: string, multi: boolean) {
    if (submitted || !active) return;
    setAnswers((prev) => {
      const cur = prev[qid] ?? { selected: new Set<string>(), other: "" };
      const next = new Set(cur.selected);
      if (multi) {
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
      } else {
        next.clear();
        next.add(opt);
      }
      return { ...prev, [qid]: { ...cur, selected: next } };
    });
  }

  function setOther(qid: string, value: string) {
    if (submitted || !active) return;
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...(prev[qid] ?? { selected: new Set<string>(), other: "" }), other: value },
    }));
  }

  const hasAnyAnswer = block.questions.some((q) => {
    const a = answers[q.id];
    return a && (a.selected.size > 0 || a.other.trim().length > 0);
  });

  function handleSubmit() {
    const lines: string[] = ["Jawaban klarifikasi:"];
    for (const q of block.questions) {
      const a = answers[q.id];
      const picks: string[] = [];
      if (a) {
        a.selected.forEach((v) => picks.push(v));
        if (a.other.trim()) picks.push(`Lainnya: ${a.other.trim()}`);
      }
      lines.push(`- ${q.q} → ${picks.length > 0 ? picks.join("; ") : "(skip)"}`);
    }
    setSubmitted(true);
    onSubmit(lines.join("\n"));
  }

  function handleSkip() {
    setSubmitted(true);
    onSubmit("Skip klarifikasi — pakai asumsi default yang reasonable, langsung draft PRD.");
  }

  return (
    <div className="my-4 overflow-hidden rounded-sm border border-rule bg-canvas-raised">
      <div className="border-b border-rule bg-canvas-sunken px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        Klarifikasi singkat · {block.questions.length} pertanyaan
      </div>

      <div className="space-y-5 px-4 py-4">
        {block.intro && (
          <p className="text-[13.5px] leading-relaxed text-ink-muted">{block.intro}</p>
        )}

        {block.questions.map((q, qi) => {
          const a = answers[q.id] ?? { selected: new Set<string>(), other: "" };
          return (
            <div key={q.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-ink-subtle">{qi + 1}.</span>
                <span className="text-[13.5px] font-medium text-ink">{q.q}</span>
                {q.multi && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                    pilih ≥1
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => {
                  const picked = a.selected.has(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted || !active}
                      onClick={() => toggle(q.id, opt, !!q.multi)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12.5px] transition",
                        picked
                          ? "border-ink bg-ink text-canvas"
                          : "border-rule bg-canvas text-ink-muted hover:border-ink hover:text-ink",
                        (submitted || !active) && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {picked && <Check className="h-3 w-3" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {q.allowOther && (
                <input
                  type="text"
                  value={a.other}
                  disabled={submitted || !active}
                  onChange={(e) => setOther(q.id, e.target.value)}
                  placeholder="Lainnya (opsional)…"
                  className="mt-2 w-full rounded-sm border border-rule bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none disabled:opacity-60"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-rule bg-canvas-sunken px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          {submitted ? "Terkirim" : active ? "Pilih atau skip" : "Sudah lewat"}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitted || !active}
            className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            <SkipForward className="h-3 w-3" />
            Skip & lanjut
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitted || !active || !hasAnyAnswer}
            className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-fg transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            Kirim jawaban
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
