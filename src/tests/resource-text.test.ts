import { describe, expect, it } from "vitest";

import {
  chunkExtractedText,
  chunkPagesWithPageLocations,
  chunkTextWithLineLocations,
  formatResourceChunkCitation,
  getResourceExtractability,
  isSuspiciousExtractedText,
  normalizeExtractedText
} from "@/lib/resource-text-rules";

describe("resource text extraction helpers", () => {
  it("detects extractable and unsupported resource types", () => {
    expect(getResourceExtractability({ contentType: "text/plain", fileName: "notes.bin" })).toBe("TEXT");
    expect(getResourceExtractability({ contentType: "text/markdown", fileName: "guide.bin" })).toBe("MARKDOWN");
    expect(getResourceExtractability({ contentType: "", fileName: "guide.md" })).toBe("MARKDOWN");
    expect(getResourceExtractability({ contentType: "application/pdf", fileName: "brief.bin" })).toBe("PDF");
    expect(getResourceExtractability({ contentType: "", fileName: "brief.pdf" })).toBe("PDF");
    expect(getResourceExtractability({ contentType: "application/zip", fileName: "assets.zip" })).toBe("UNSUPPORTED");
    expect(getResourceExtractability({ contentType: "image/png", fileName: "map.png" })).toBe("UNSUPPORTED");
  });

  it("normalizes and chunks extracted text in order", () => {
    expect(normalizeExtractedText(" First   line\r\n\r\n\r\nSecond\tline ")).toBe("First line\n\nSecond line");
    expect(normalizeExtractedText("Alpha\u0000\u0007\uFFFD Beta!!!!!!!!!")).toBe("Alpha Beta!!!!!!!!");

    const chunks = chunkExtractedText("Alpha sentence. Beta sentence. Gamma sentence.", 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toContain("Alpha sentence.");
    expect(chunks.join(" ")).toContain("Gamma sentence.");
    expect(chunkExtractedText("   ")).toEqual([]);
  });

  it("chunks text and markdown with line locations", () => {
    const chunks = chunkTextWithLineLocations("Line one\nLine two has more text\nLine three", 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      lineStart: 1,
      lineEnd: 1
    });
    expect(chunks.at(-1)).toMatchObject({
      lineStart: 3,
      lineEnd: 3
    });
  });

  it("chunks PDF page text with page locations", () => {
    const chunks = chunkPagesWithPageLocations(
      [
        { pageNumber: 1, text: "First PDF page." },
        { pageNumber: 2, text: "Second PDF page." },
        { pageNumber: 3, text: "Third PDF page with enough words." }
      ],
      40
    );

    expect(chunks[0]).toMatchObject({
      pageStart: 1,
      pageEnd: 2
    });
    expect(chunks[1]).toMatchObject({
      pageStart: 3,
      pageEnd: 3
    });
  });

  it("formats resource chunk citations from structured locations", () => {
    expect(formatResourceChunkCitation({ chunkIndex: 0, pageStart: 12, pageEnd: 12 })).toBe(
      "p. 12"
    );
    expect(formatResourceChunkCitation({ chunkIndex: 0, pageStart: 12, pageEnd: 13 })).toBe(
      "pp. 12-13"
    );
    expect(formatResourceChunkCitation({ chunkIndex: 0, lineStart: 42, lineEnd: 58 })).toBe(
      "lines 42-58"
    );
    expect(formatResourceChunkCitation({ chunkIndex: 4 })).toBe("chunk 5");
  });

  it("rejects suspicious extracted text before chunking", () => {
    const brokenText = `${"\u0000".repeat(50)}${"\uFFFD".repeat(50)}abc`;

    expect(isSuspiciousExtractedText(brokenText)).toBe(true);
    expect(chunkExtractedText(brokenText)).toEqual([]);
    expect(isSuspiciousExtractedText("Readable mission notes with normal punctuation.")).toBe(false);
  });
});
