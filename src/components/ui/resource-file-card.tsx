import type { ReactNode } from "react";
import {
  Archive,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation
} from "lucide-react";

import { ProtectedFileLink } from "@/components/ui/protected-file-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date-format";
import { formatFileSize, getFileKind, type FileKind } from "@/lib/file-display";
import type { UploadIntent } from "@/lib/upload-rules";

const iconClassName = "h-5 w-5";

function FileKindIcon({ kind }: { kind: FileKind }) {
  if (kind === "PDF" || kind === "Document" || kind === "Text") {
    return <FileText aria-hidden className={iconClassName} />;
  }
  if (kind === "Slides") {
    return <Presentation aria-hidden className={iconClassName} />;
  }
  if (kind === "Spreadsheet") {
    return <FileSpreadsheet aria-hidden className={iconClassName} />;
  }
  if (kind === "Image") {
    return <FileImage aria-hidden className={iconClassName} />;
  }
  if (kind === "Zip") {
    return <Archive aria-hidden className={iconClassName} />;
  }
  if (kind === "File") {
    return <File aria-hidden className={iconClassName} />;
  }

  return <FileType aria-hidden className={iconClassName} />;
}

export function ResourceFileCard({
  actionSlot,
  activityId,
  className,
  contentType,
  createdAt,
  fileName,
  fileUrl,
  intent,
  position,
  size,
  title
}: {
  actionSlot?: ReactNode;
  activityId: string;
  className?: string;
  contentType?: string | null;
  createdAt?: Date | null;
  fileName: string;
  fileUrl: string;
  intent: UploadIntent;
  position?: number;
  size?: number | null;
  title: string;
}) {
  const kind = getFileKind(contentType, fileName);

  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-lg border border-border/80 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        className ?? ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface-muted text-moss">
          <FileKindIcon kind={kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 max-w-full truncate text-sm font-semibold" title={title}>
              {position ? `${position}. ` : ""}
              {title}
            </p>
            <StatusBadge tone="info">{kind}</StatusBadge>
          </div>
          <p className="mt-1 truncate text-xs text-ink/55" title={fileName}>
            {fileName}
          </p>
          <p className="mt-1 text-xs text-ink/55">
            {formatFileSize(size)} - Added {formatDate(createdAt)}
          </p>
          <div className="mt-3">
            <ProtectedFileLink
              activityId={activityId}
              fileUrl={fileUrl}
              intent={intent}
              label="Open resource"
            />
          </div>
        </div>
      </div>
      {actionSlot ? <div className="shrink-0">{actionSlot}</div> : null}
    </div>
  );
}
