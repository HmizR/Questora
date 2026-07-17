"use client";

import { useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { isProtectedStorageRef, type UploadIntent } from "@/lib/upload-rules";
import { cn } from "@/lib/utils";

export function ProtectedFileLink({
  activityId,
  className,
  fileUrl,
  intent,
  label = "Open file"
}: {
  activityId?: string;
  className?: string;
  fileUrl: string;
  intent: UploadIntent;
  label?: string;
}) {
  const { showToast } = useToast();
  const [isOpening, setIsOpening] = useState(false);

  if (!isProtectedStorageRef(fileUrl)) {
    return (
      <a
        className={cn("inline-flex items-center gap-2 text-sm font-semibold text-moss hover:underline", className)}
        href={fileUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink aria-hidden className="h-4 w-4" />
        {label}
      </a>
    );
  }

  async function openProtectedFile() {
    setIsOpening(true);
    try {
      const response = await fetch("/api/uploads/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          activityId,
          intent,
          storageRef: fileUrl
        })
      });
      const body = (await response.json()) as {
        downloadUrl?: string;
        error?: { message?: string };
      };

      if (!response.ok || !body.downloadUrl) {
        throw new Error(body.error?.message ?? "Could not open this file.");
      }

      window.open(body.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Could not open this file.",
        variant: "error"
      });
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button
      className={cn("inline-flex items-center gap-2 text-sm font-semibold text-moss hover:underline", className)}
      disabled={isOpening}
      onClick={openProtectedFile}
      type="button"
    >
      {isOpening ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <FileText aria-hidden className="h-4 w-4" />
      )}
      {isOpening ? "Opening..." : label}
    </button>
  );
}
