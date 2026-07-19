export type FileKind =
  | "PDF"
  | "Slides"
  | "Document"
  | "Spreadsheet"
  | "Image"
  | "Zip"
  | "Text"
  | "File";

const extensionKind: Record<string, FileKind> = {
  csv: "Spreadsheet",
  doc: "Document",
  docx: "Document",
  gif: "Image",
  jpeg: "Image",
  jpg: "Image",
  pdf: "PDF",
  png: "Image",
  ppt: "Slides",
  pptx: "Slides",
  txt: "Text",
  webp: "Image",
  xls: "Spreadsheet",
  xlsx: "Spreadsheet",
  zip: "Zip"
};

export function getFileKind(contentType: string | null | undefined, fileName: string) {
  const normalizedType = contentType?.toLowerCase() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (normalizedType.includes("pdf")) return "PDF";
  if (normalizedType.includes("presentation") || normalizedType.includes("powerpoint")) {
    return "Slides";
  }
  if (normalizedType.includes("wordprocessing") || normalizedType.includes("msword")) {
    return "Document";
  }
  if (normalizedType.includes("spreadsheet") || normalizedType.includes("excel")) {
    return "Spreadsheet";
  }
  if (normalizedType.startsWith("image/")) return "Image";
  if (normalizedType.includes("zip")) return "Zip";
  if (normalizedType.startsWith("text/")) return "Text";

  return extensionKind[extension] ?? "File";
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) {
    return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  }

  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(gigabytes >= 10 ? 0 : 1)} GB`;
}
