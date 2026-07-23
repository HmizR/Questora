import { describe, expect, it } from "vitest";

import {
  chunkExtractedText,
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

  it("rejects suspicious extracted text before chunking", () => {
    const brokenText = `${"\u0000".repeat(50)}${"\uFFFD".repeat(50)}abc`;

    expect(isSuspiciousExtractedText(brokenText)).toBe(true);
    expect(chunkExtractedText(brokenText)).toEqual([]);
    expect(isSuspiciousExtractedText("Readable mission notes with normal punctuation.")).toBe(false);
  });
});
