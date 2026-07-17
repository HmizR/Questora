"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Paperclip, Upload, X } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import {
  formatMaxUploadSize,
  isAllowedUploadSize,
  isAllowedUploadType,
  isProtectedStorageRef
} from "@/lib/upload-rules";

type UploadState = "idle" | "uploading" | "uploaded" | "failed";

export function StudentSubmissionFileUpload({
  activityId,
  defaultFileUrl
}: {
  activityId: string;
  defaultFileUrl?: string | null;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState(defaultFileUrl ?? "");
  const [selectedName, setSelectedName] = useState("");
  const [status, setStatus] = useState<UploadState>(defaultFileUrl ? "uploaded" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);

    if (!isAllowedUploadType("SUBMISSION", file.type)) {
      const message = "This file type is not allowed for submissions.";
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
      return;
    }

    if (!isAllowedUploadSize("SUBMISSION", file.size)) {
      const message = `Submission files must be ${formatMaxUploadSize("SUBMISSION")} or smaller.`;
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
      return;
    }

    setSelectedName(file.name);
    setStatus("uploading");

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          activityId,
          contentType: file.type,
          fileName: file.name,
          intent: "SUBMISSION",
          size: file.size
        })
      });
      const presignBody = (await presignResponse.json()) as {
        uploadUrl?: string;
        storageRef?: string;
        error?: { message?: string };
      };

      if (!presignResponse.ok || !presignBody.uploadUrl || !presignBody.storageRef) {
        throw new Error(presignBody.error?.message ?? "Could not prepare this upload.");
      }

      const uploadResponse = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "content-type": file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error("The file upload failed.");
      }

      setFileUrl(presignBody.storageRef);
      setStatus("uploaded");
      showToast({ message: "File uploaded.", variant: "success" });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "The file upload failed.";
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
    }
  }

  function resetFile() {
    setFileUrl("");
    setSelectedName("");
    setStatus("idle");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const attachedLabel = selectedName || (fileUrl ? "Attached file" : "");

  return (
    <div className="rounded-lg border border-border/80 bg-surface-muted p-4">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <label className="text-sm font-bold" htmlFor="submission-file">
            Upload file
          </label>
          <p className="mt-1 text-xs text-ink/55">
            One PDF, Office file, image, text file, or zip up to {formatMaxUploadSize("SUBMISSION")}.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/20 bg-surface px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "uploading"}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {status === "uploading" ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="h-4 w-4" />
          )}
          {status === "uploading" ? "Uploading..." : fileUrl ? "Replace file" : "Choose file"}
        </button>
      </div>

      <input
        className="sr-only"
        id="submission-file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadFile(file);
        }}
        ref={fileInputRef}
        type="file"
      />

      {fileUrl ? (
        <div className="mt-3 flex min-w-0 flex-col gap-2 overflow-hidden rounded-md border border-border/80 bg-surface p-3 text-sm">
          <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
            {isProtectedStorageRef(fileUrl) ? (
              <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-moss" />
            ) : (
              <Paperclip aria-hidden className="h-4 w-4 shrink-0 text-steel" />
            )}
            <span className="block min-w-0 max-w-full flex-1 truncate" title={attachedLabel}>
              {attachedLabel} {isProtectedStorageRef(fileUrl) ? "(protected)" : "(URL/reference)"}
            </span>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-1 self-start text-xs font-semibold text-ember hover:underline"
            onClick={resetFile}
            type="button"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
          {error}
        </p>
      ) : null}

      <label className="mt-4 block text-sm font-medium">
        File URL
        <input
          className="mt-2 w-full min-w-0 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-moss/40 focus:ring-4"
          name="fileUrl"
          onChange={(event) => {
            setFileUrl(event.currentTarget.value);
            setStatus(event.currentTarget.value ? "uploaded" : "idle");
            setError(null);
          }}
          placeholder="Upload a file above, paste a URL, or paste an s3: reference"
          value={fileUrl}
        />
      </label>
    </div>
  );
}
