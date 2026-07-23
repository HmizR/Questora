export type ResourceExtractability = "TEXT" | "MARKDOWN" | "PDF" | "UNSUPPORTED";

const CHUNK_SIZE = 2000;
export const MAX_RESOURCE_TEXT_CHUNKS = 20;
const MAX_REPEATED_SYMBOLS = 8;
const MAX_CONTROL_RATIO = 0.02;
const MAX_REPLACEMENT_RATIO = 0.01;
const MIN_READABLE_RATIO = 0.55;

export type ExtractedTextChunk = {
  content: string;
  pageStart?: number;
  pageEnd?: number;
  lineStart?: number;
  lineEnd?: number;
};

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
  return chunkPlainExtractedText(text, chunkSize).map((chunk) => chunk.content);
}

export function chunkPlainExtractedText(text: string, chunkSize = CHUNK_SIZE): ExtractedTextChunk[] {
  if (isSuspiciousExtractedText(text)) return [];

  const normalized = sanitizeExtractedText(text);
  if (!normalized) return [];

  const chunks: ExtractedTextChunk[] = [];
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

    const content = normalized.slice(cursor, cursor + breakAt).trim();
    if (content) {
      chunks.push({ content });
    }
    cursor += breakAt;
  }

  return chunks;
}

export function chunkTextWithLineLocations(text: string, chunkSize = CHUNK_SIZE): ExtractedTextChunk[] {
  const normalizedLineEndings = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (isSuspiciousExtractedText(normalizedLineEndings)) return [];

  const lines = normalizedLineEndings.split("\n");
  const chunks: ExtractedTextChunk[] = [];
  let currentLines: string[] = [];
  let currentStartLine = 1;

  const flush = (lineEnd: number) => {
    const content = sanitizeExtractedText(currentLines.join("\n"));
    if (content) {
      chunks.push({
        content,
        lineStart: currentStartLine,
        lineEnd
      });
    }
    currentLines = [];
  };

  for (let index = 0; index < lines.length && chunks.length < MAX_RESOURCE_TEXT_CHUNKS; index += 1) {
    const line = lines[index] ?? "";
    if (currentLines.length === 0) {
      currentStartLine = index + 1;
    }

    const candidate = [...currentLines, line].join("\n");
    if (sanitizeExtractedText(candidate).length > chunkSize && currentLines.length > 0) {
      flush(index);
      if (chunks.length >= MAX_RESOURCE_TEXT_CHUNKS) break;
      currentStartLine = index + 1;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 && chunks.length < MAX_RESOURCE_TEXT_CHUNKS) {
    flush(lines.length);
  }

  return chunks;
}

export function chunkPagesWithPageLocations(
  pages: Array<{ pageNumber: number; text: string }>,
  chunkSize = CHUNK_SIZE
): ExtractedTextChunk[] {
  const chunks: ExtractedTextChunk[] = [];
  let currentTexts: string[] = [];
  let currentStartPage: number | null = null;
  let currentEndPage: number | null = null;

  const flush = () => {
    if (currentStartPage === null || currentEndPage === null) return;

    const content = sanitizeExtractedText(currentTexts.join("\n\n"));
    if (content && !isSuspiciousExtractedText(content)) {
      chunks.push({
        content,
        pageStart: currentStartPage,
        pageEnd: currentEndPage
      });
    }

    currentTexts = [];
    currentStartPage = null;
    currentEndPage = null;
  };

  for (const page of pages) {
    if (chunks.length >= MAX_RESOURCE_TEXT_CHUNKS) break;

    const pageText = sanitizeExtractedText(page.text);
    if (!pageText) continue;
    if (isSuspiciousExtractedText(pageText)) continue;

    if (pageText.length > chunkSize) {
      flush();
      const pageChunks = chunkPlainExtractedText(pageText, chunkSize);
      for (const chunk of pageChunks) {
        if (chunks.length >= MAX_RESOURCE_TEXT_CHUNKS) break;
        chunks.push({
          ...chunk,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber
        });
      }
      continue;
    }

    const candidate = sanitizeExtractedText([...currentTexts, pageText].join("\n\n"));
    if (candidate.length > chunkSize && currentTexts.length > 0) {
      flush();
    }

    if (currentStartPage === null) {
      currentStartPage = page.pageNumber;
    }
    currentEndPage = page.pageNumber;
    currentTexts.push(pageText);
  }

  if (currentTexts.length > 0 && chunks.length < MAX_RESOURCE_TEXT_CHUNKS) {
    flush();
  }

  return chunks;
}

export function formatResourceChunkCitation(input: {
  chunkIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}) {
  if (input.pageStart) {
    const pageEnd = input.pageEnd ?? input.pageStart;
    return pageEnd === input.pageStart ? `p. ${input.pageStart}` : `pp. ${input.pageStart}-${pageEnd}`;
  }

  if (input.lineStart) {
    const lineEnd = input.lineEnd ?? input.lineStart;
    return lineEnd === input.lineStart
      ? `line ${input.lineStart}`
      : `lines ${input.lineStart}-${lineEnd}`;
  }

  return `chunk ${input.chunkIndex + 1}`;
}
