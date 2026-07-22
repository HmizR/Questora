export type ResourceExtractability = "TEXT" | "MARKDOWN" | "PDF" | "UNSUPPORTED";

const CHUNK_SIZE = 2000;
export const MAX_RESOURCE_TEXT_CHUNKS = 20;

export function getResourceExtractability(input: {
  contentType: string | null | undefined;
  fileName: string;
}): ResourceExtractability {
  const contentType = input.contentType?.toLowerCase() ?? "";
  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";

  if (contentType.includes("pdf") || extension === "pdf") return "PDF";
  if (contentType.includes("markdown") || extension === "md" || extension === "markdown") {
    return "MARKDOWN";
  }
  if (contentType.startsWith("text/") || extension === "txt") return "TEXT";

  return "UNSUPPORTED";
}

export function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkExtractedText(text: string, chunkSize = CHUNK_SIZE) {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length && chunks.length < MAX_RESOURCE_TEXT_CHUNKS) {
    const nextCursor = Math.min(cursor + chunkSize, normalized.length);
    const candidate = normalized.slice(cursor, nextCursor);
    const lastParagraphBreak = candidate.lastIndexOf("\n\n");
    const lastSentenceBreak = Math.max(candidate.lastIndexOf(". "), candidate.lastIndexOf("? "), candidate.lastIndexOf("! "));
    const breakAt =
      nextCursor < normalized.length && lastParagraphBreak > chunkSize * 0.45
        ? lastParagraphBreak + 2
        : nextCursor < normalized.length && lastSentenceBreak > chunkSize * 0.45
          ? lastSentenceBreak + 2
          : candidate.length;

    chunks.push(normalized.slice(cursor, cursor + breakAt).trim());
    cursor += breakAt;
  }

  return chunks.filter(Boolean);
}
