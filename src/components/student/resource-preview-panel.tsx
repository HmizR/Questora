"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, FileWarning, Loader2, X } from "lucide-react";
import type { ActivityResourceKind } from "@prisma/client";

import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatFileSize, getFileKind, getPreviewKind, type PreviewKind } from "@/lib/file-display";
import { isProtectedStorageRef } from "@/lib/upload-rules";

const AIMarkdown = dynamic(
  () => import("@/components/ai/ai-markdown").then((module) => module.AIMarkdown),
  {
    ssr: false,
    loading: () => <p className="text-sm text-ink/65">Formatting preview...</p>
  }
);

export type PreviewResource = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  contentType: string | null;
  size: number | null;
  isRequired: boolean;
  kind: ActivityResourceKind;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string; text?: string }
  | { status: "error"; message: string };

function isMarkdownResource(resource: PreviewResource) {
  const type = resource.contentType?.toLowerCase() ?? "";
  const extension = resource.fileName.split(".").pop()?.toLowerCase() ?? "";

  return type.includes("markdown") || extension === "md" || extension === "markdown";
}

export function ResourcePreviewPanel({
  activityId,
  onClose,
  resource
}: {
  activityId: string;
  onClose: () => void;
  resource: PreviewResource;
}) {
  const { showToast } = useToast();
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const previewKind = useMemo(
    () => getPreviewKind(resource.contentType, resource.fileName),
    [resource.contentType, resource.fileName]
  );
  const fileKind = getFileKind(resource.contentType, resource.fileName);

  useEffect(() => {
    let isMounted = true;

    async function resolvePreview() {
      if (previewKind === "UNSUPPORTED") {
        setState({ status: "idle" });
        return;
      }

      setState({ status: "loading" });

      try {
        const url = await resolveResourceUrl({ activityId, resource });
        if (previewKind === "TEXT") {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Could not load the text preview.");
          }
          const text = await response.text();
          if (isMounted) setState({ status: "ready", url, text });
          return;
        }

        if (isMounted) setState({ status: "ready", url });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load the resource preview.";
        if (isMounted) setState({ status: "error", message });
        showToast({ message, variant: "error" });
      }
    }

    void resolvePreview();

    return () => {
      isMounted = false;
    };
  }, [activityId, previewKind, resource, showToast]);

  async function openResource() {
    try {
      const url =
        state.status === "ready" ? state.url : await resolveResourceUrl({ activityId, resource });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Could not open this resource.",
        variant: "error"
      });
    }
  }

  return (
    <section className="mt-5 rounded-lg border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 hover:bg-surface-muted"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
              <span className="sr-only">Close resource preview</span>
            </button>
            <Eye aria-hidden className="h-4 w-4 text-moss" />
            <h2 className="min-w-0 truncate font-bold" title={resource.title}>
              Preview: {resource.title}
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">{fileKind}</StatusBadge>
            <StatusBadge tone={resource.isRequired ? "warning" : "neutral"}>
              {resource.isRequired ? "Required" : "Optional"}
            </StatusBadge>
            <span className="text-xs text-ink/55">{formatFileSize(resource.size)}</span>
            <span className="max-w-full truncate text-xs text-ink/55" title={resource.fileName}>
              {resource.fileName}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border/80 px-3 py-2 text-sm font-semibold text-moss hover:bg-surface-muted"
            onClick={openResource}
            type="button"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Open
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-border/80 bg-surface-muted">
        {renderPreviewContent({ isMarkdown: isMarkdownResource(resource), previewKind, state })}
      </div>
    </section>
  );
}

async function resolveResourceUrl({
  activityId,
  resource
}: {
  activityId: string;
  resource: PreviewResource;
}) {
  if (!isProtectedStorageRef(resource.fileUrl)) {
    return resource.fileUrl;
  }

  const response = await fetch("/api/uploads/download", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      activityId,
      intent: "MISSION_RESOURCE",
      storageRef: resource.fileUrl
    })
  });
  const body = (await response.json()) as {
    downloadUrl?: string;
    error?: { message?: string };
  };

  if (!response.ok || !body.downloadUrl) {
    throw new Error(body.error?.message ?? "Could not load this resource.");
  }

  return body.downloadUrl;
}

function renderPreviewContent({
  isMarkdown,
  previewKind,
  state
}: {
  isMarkdown: boolean;
  previewKind: PreviewKind;
  state: PreviewState;
}) {
  if (previewKind === "UNSUPPORTED") {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
        <FileWarning aria-hidden className="h-8 w-8 text-ink/40" />
        <p className="mt-3 font-semibold">Preview is not available for this file type.</p>
        <p className="mt-1 text-sm text-ink/60">Open or download the resource to view it.</p>
      </div>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="flex min-h-52 items-center justify-center gap-2 p-6 text-sm text-ink/60">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Loading preview...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
        <FileWarning aria-hidden className="h-8 w-8 text-ember" />
        <p className="mt-3 font-semibold text-ember">Preview could not be loaded.</p>
        <p className="mt-1 text-sm text-ink/60">{state.message}</p>
      </div>
    );
  }

  if (previewKind === "PDF") {
    return <iframe className="h-[70vh] w-full bg-white" src={state.url} title="Resource PDF preview" />;
  }

  if (previewKind === "IMAGE") {
    return (
      <div className="max-h-[70vh] overflow-auto bg-ink/5 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Resource preview" className="mx-auto max-h-[66vh] max-w-full rounded-md" src={state.url} />
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto bg-surface p-4 text-sm leading-6">
      {isMarkdown && state.text ? (
        <AIMarkdown content={state.text} />
      ) : (
        <pre className="whitespace-pre-wrap break-words font-sans">{state.text}</pre>
      )}
    </div>
  );
}
