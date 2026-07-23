export type ResourceExtractability = "TEXT" | "MARKDOWN" | "PDF" | "UNSUPPORTED";

const CHUNK_SIZE = 2000;
export const MAX_RESOURCE_TEXT_CHUNKS = 20;
const MAX_REPEATED_SYMBOLS = 8;
const MAX_CONTROL_RATIO = 0.02;
const MAX_REPLACEMENT_RATIO = 0.01;
const MIN_READABLE_RATIO = 0.55;

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

export function sanitizeExtractedText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .replace(new RegExp(`([^\\p{L}\\p{N}\\s])\\1{${MAX_REPEATED_SYMBOLS},}`, "gu"), "$1".repeat(MAX_REPEATED_SYMBOLS))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const normalizeExtractedText = sanitizeExtractedText;

export function isSuspiciousExtractedText(text: string) {
  if (!text.trim()) return true;

  const totalLength = text.length;
  const controlMatches = text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g) ?? [];
  const replacementMatches = text.match(/\uFFFD/g) ?? [];
  const readableMatches = text.match(/[\p{L}\p{N}\p{P}\p{S}\s]/gu) ?? [];
  const controlRatio = controlMatches.length / totalLength;
  const replacementRatio = replacementMatches.length / totalLength;
  const readableRatio = readableMatches.length / totalLength;

  return (
    controlRatio > MAX_CONTROL_RATIO ||
    replacementRatio > MAX_REPLACEMENT_RATIO ||
    readableRatio < MIN_READABLE_RATIO
  );
}

export function chunkExtractedText(text: string, chunkSize = CHUNK_SIZE) {
  if (isSuspiciousExtractedText(text)) return [];

  const normalized = sanitizeExtractedText(text);
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
