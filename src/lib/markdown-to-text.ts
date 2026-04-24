/**
 * Convert markdown to clean plain text suitable for pasting into
 * Slack, email, Notion, etc. Strips formatting syntax but preserves
 * structure (headings as ALL CAPS, lists with bullets, tables as
 * pipe-separated rows readable by humans).
 */
export function markdownToPlainText(md: string): string {
  let s = md;

  // Code fences → keep content, drop fences
  s = s.replace(/```[\w-]*\n([\s\S]*?)```/g, (_, code) => code.trim());

  // Inline code → just the text
  s = s.replace(/`([^`]+)`/g, "$1");

  // Images → alt text only
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Links → "text (url)" if external-looking, else just text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    if (/^https?:\/\//i.test(url)) return `${text} (${url})`;
    return text;
  });

  // Bold / italic / strikethrough → drop syntax
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/~~([^~]+)~~/g, "$1");

  // Blockquote markers
  s = s.replace(/^>\s?/gm, "");

  // Horizontal rules
  s = s.replace(/^[-*_]{3,}\s*$/gm, "—".repeat(20));

  // Headings → keep as # / ## / ### so structure remains visible
  s = s.replace(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm, (_, hashes, text) => {
    return `\n${hashes} ${text}`;
  });

  // Tables: convert pipe rows to readable form, drop separator rows
  s = s
    .split("\n")
    .filter((line) => !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line))
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return line;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      return cells.join("  ·  ");
    })
    .join("\n");

  // List markers: keep bullet character but normalize
  s = s.replace(/^(\s*)[-*+]\s+/gm, "$1• ");
  s = s.replace(/^(\s*)(\d+)\.\s+/gm, "$1$2. ");

  // Collapse 3+ blank lines to 2
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
