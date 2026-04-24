/**
 * Parse assistant messages into a sequence of segments:
 *   - text:     plain markdown shown in chat bubble
 *   - artifact: replaced by an inline card; full content lives in panel
 *
 * Primary format expected from the model:
 *   <artifact title="…" version="v1">…markdown…</artifact>
 *
 * Fallback: if the model forgets the tag but produces a doc-shaped markdown
 * (H1 + ≥2 H2), wrap the whole thing as an artifact so UX still works.
 */

export type Artifact = {
  /** Stable id derived from messageId + index in that message */
  id: string;
  messageId: string;
  /** 0-based index of this artifact within the message */
  indexInMessage: number;
  title: string;
  version: string;
  content: string;
};

export type ClarifyQuestion = {
  id: string;
  q: string;
  options: string[];
  multi?: boolean;
  allowOther?: boolean;
};

export type ClarifyBlock = {
  id: string;
  messageId: string;
  intro?: string;
  questions: ClarifyQuestion[];
  /** True while the closing </clarify> tag hasn't streamed yet */
  streaming: boolean;
};

export type Segment =
  | { kind: "text"; content: string }
  | { kind: "artifact"; artifact: Artifact }
  | { kind: "clarify"; clarify: ClarifyBlock };

const ARTIFACT_RE =
  /<artifact\b([^>]*)>([\s\S]*?)(?:<\/artifact>|$)/gi;

const CLARIFY_RE = /<clarify\b[^>]*>([\s\S]*?)(<\/clarify>|$)/gi;

const ATTR_RE = /(\w+)\s*=\s*"([^"]*)"/g;

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw)) !== null) out[m[1].toLowerCase()] = m[2];
  return out;
}

export function parseMessage(messageId: string, content: string): Segment[] {
  if (!content) return [];

  // First pass: extract <clarify> blocks and replace them with placeholder tokens.
  // This way the existing artifact parser sees them as regular text gaps.
  const clarifyBlocks: ClarifyBlock[] = [];
  let work = content;
  CLARIFY_RE.lastIndex = 0;
  work = work.replace(CLARIFY_RE, (_full, inner: string, closing: string) => {
    const idx = clarifyBlocks.length;
    const streaming = !closing;
    const block = parseClarify(messageId, idx, inner, streaming);
    if (block) {
      clarifyBlocks.push(block);
      return `\u0000CLARIFY_${idx}\u0000`;
    }
    // Drop malformed clarify blocks entirely from text
    return "";
  });

  const segments: Segment[] = [];
  let lastIdx = 0;
  let artifactIdx = 0;
  let m: RegExpExecArray | null;

  // Reset regex state
  ARTIFACT_RE.lastIndex = 0;

  while ((m = ARTIFACT_RE.exec(work)) !== null) {
    const before = work.slice(lastIdx, m.index);
    pushTextWithClarify(segments, before, clarifyBlocks);
    const attrs = parseAttrs(m[1] ?? "");
    const inner = (m[2] ?? "").trim();
    segments.push({
      kind: "artifact",
      artifact: {
        id: `${messageId}:${artifactIdx}`,
        messageId,
        indexInMessage: artifactIdx,
        title: attrs.title?.trim() || deriveTitle(inner) || "Untitled artifact",
        version: attrs.version?.trim() || "v1",
        content: inner,
      },
    });
    artifactIdx += 1;
    lastIdx = m.index + m[0].length;
  }

  const tail = work.slice(lastIdx);
  pushTextWithClarify(segments, tail, clarifyBlocks);

  // Fallback: no tag found AND no clarify block but content looks like a PRD doc → wrap it
  if (artifactIdx === 0 && clarifyBlocks.length === 0) {
    const looksLikeDoc = isDocShaped(content);
    if (looksLikeDoc) {
      return [
        {
          kind: "artifact",
          artifact: {
            id: `${messageId}:0`,
            messageId,
            indexInMessage: 0,
            title: deriveTitle(content) ?? "Untitled artifact",
            version: "v1",
            content: content.trim(),
          },
        },
      ];
    }
  }

  return segments;
}

function pushTextWithClarify(
  segments: Segment[],
  text: string,
  clarifyBlocks: ClarifyBlock[]
) {
  if (!text) return;
  // Split on clarify placeholders, interleave clarify segments
  const parts = text.split(/\u0000CLARIFY_(\d+)\u0000/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      const t = parts[i];
      if (t && t.trim()) segments.push({ kind: "text", content: t.trim() });
    } else {
      const idx = parseInt(parts[i], 10);
      const block = clarifyBlocks[idx];
      if (block) segments.push({ kind: "clarify", clarify: block });
    }
  }
}

function parseClarify(
  messageId: string,
  idx: number,
  raw: string,
  streaming: boolean
): ClarifyBlock | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // While streaming, the JSON may not be complete — try parse, swallow errors silently
  try {
    const parsed = JSON.parse(trimmed) as {
      intro?: string;
      questions?: ClarifyQuestion[];
    };
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return streaming ? buildStreamingPlaceholder(messageId, idx) : null;
    }
    const questions = parsed.questions
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.options))
      .map((q, qi) => ({
        id: q.id || `q${qi + 1}`,
        q: q.q,
        options: q.options.filter((o) => typeof o === "string"),
        multi: !!q.multi,
        allowOther: !!q.allowOther,
      }));
    if (questions.length === 0) return streaming ? buildStreamingPlaceholder(messageId, idx) : null;
    return {
      id: `${messageId}:clarify:${idx}`,
      messageId,
      intro: parsed.intro,
      questions,
      streaming,
    };
  } catch {
    return streaming ? buildStreamingPlaceholder(messageId, idx) : null;
  }
}

function buildStreamingPlaceholder(messageId: string, idx: number): ClarifyBlock {
  return {
    id: `${messageId}:clarify:${idx}`,
    messageId,
    questions: [],
    streaming: true,
  };
}

function deriveTitle(md: string): string | null {
  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim().replace(/^\[|\]$/g, "");
  return null;
}

function isDocShaped(md: string): boolean {
  const trimmed = md.trim();
  if (!/^#\s+/m.test(trimmed)) return false;
  const h2Count = (trimmed.match(/^##\s+.+$/gm) ?? []).length;
  return h2Count >= 2;
}

