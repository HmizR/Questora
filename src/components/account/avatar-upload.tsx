"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";

import { AvatarImage } from "@/components/ui/avatar-image";
import { useToast } from "@/components/ui/toast";
import {
  formatMaxUploadSize,
  isAllowedUploadSize,
  isAllowedUploadType,
  isProtectedStorageRef
} from "@/lib/upload-rules";

type UploadState = "idle" | "uploading" | "uploaded" | "failed";

export function AvatarUpload({
  defaultAvatarUrl,
  name
}: {
  defaultAvatarUrl?: string | null;
  name: string;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [status, setStatus] = useState<UploadState>(defaultAvatarUrl ? "uploaded" : "idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function uploadFile(file: File) {
    setError(null);

    if (!isAllowedUploadType("AVATAR", file.type)) {
      const message = "Avatar uploads must be image files.";
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
      return;
    }

    if (!isAllowedUploadSize("AVATAR", file.size)) {
      const message = `Avatar images must be ${formatMaxUploadSize("AVATAR")} or smaller.`;
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(objectUrl);
    setSelectedName(file.name);
    setStatus("uploading");

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileName: file.name,
          intent: "AVATAR",
          size: file.size
        })
      });
      const presignBody = (await presignResponse.json()) as {
        uploadUrl?: string;
        storageRef?: string;
        error?: { message?: string };
      };

      if (!presignResponse.ok || !presignBody.uploadUrl || !presignBody.storageRef) {
        throw new Error(presignBody.error?.message ?? "Could not prepare this avatar upload.");
      }

      const uploadResponse = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "content-type": file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error("The avatar upload failed.");
      }

      setAvatarUrl(presignBody.storageRef);
      setStatus("uploaded");
      showToast({ message: "Avatar uploaded.", variant: "success" });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "The avatar upload failed.";
      setStatus("failed");
      setError(message);
      showToast({ message, variant: "error" });
    }
  }

  function resetAvatar() {
    setAvatarUrl("");
    setSelectedName("");
    setStatus("idle");
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const displayUrl = previewUrl ?? avatarUrl;

  return (
    <div className="rounded-lg border border-border/80 bg-surface-muted p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AvatarImage avatarUrl={displayUrl} name={name} />
        <div className="min-w-0 flex-1">
          <label className="text-sm font-bold" htmlFor="avatar-file">
            Avatar image
          </label>
          <p className="mt-1 text-xs text-ink/55">
            Upload a PNG, JPG, WebP, or GIF up to {formatMaxUploadSize("AVATAR")}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
              {status === "uploading" ? "Uploading..." : avatarUrl ? "Replace avatar" : "Choose image"}
            </button>
            {avatarUrl ? (
              <button
                className="inline-flex items-center gap-1 rounded-md border border-ember/30 bg-surface px-3 py-2 text-sm font-semibold text-ember hover:bg-ember hover:text-white"
                onClick={resetAvatar}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        className="sr-only"
        id="avatar-file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadFile(file);
        }}
        ref={fileInputRef}
        type="file"
      />

      {avatarUrl ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-border/80 bg-surface p-3 text-sm">
          <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-moss" />
          <span className="block min-w-0 flex-1 truncate" title={selectedName || avatarUrl}>
            {selectedName || "Avatar set"} {isProtectedStorageRef(avatarUrl) ? "(protected)" : "(URL/reference)"}
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
          {error}
        </p>
      ) : null}

      <label className="mt-4 block text-sm font-medium">
        Avatar URL
        <input
          className="mt-2 w-full min-w-0 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-moss/40 focus:ring-4"
          name="avatarUrl"
          onChange={(event) => {
            setAvatarUrl(event.currentTarget.value);
            setSelectedName("");
            setStatus(event.currentTarget.value ? "uploaded" : "idle");
            setError(null);
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }}
          placeholder="Upload an image above, paste a URL, or paste an s3: reference"
          value={avatarUrl}
        />
      </label>
    </div>
  );
}
