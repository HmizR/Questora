"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";

import { isProtectedStorageRef } from "@/lib/upload-rules";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AvatarImage({
  avatarUrl,
  className,
  name,
  size = "lg"
}: {
  avatarUrl?: string | null;
  className?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    avatarUrl && !isProtectedStorageRef(avatarUrl) ? avatarUrl : null
  );
  const [hasImageError, setHasImageError] = useState(false);
  const fallback = useMemo(() => initials(name), [name]);
  const sizeClassName =
    size === "sm" ? "h-9 w-9 text-xs" : size === "md" ? "h-14 w-14 text-base" : "h-20 w-20 text-xl";

  useEffect(() => {
    let isMounted = true;

    setHasImageError(false);

    if (!avatarUrl) {
      setResolvedUrl(null);
      return;
    }

    if (!isProtectedStorageRef(avatarUrl)) {
      setResolvedUrl(avatarUrl);
      return;
    }

    setResolvedUrl(null);
    fetch("/api/uploads/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intent: "AVATAR",
        storageRef: avatarUrl
      })
    })
      .then(async (response) => {
        const body = (await response.json()) as { downloadUrl?: string };
        if (!response.ok || !body.downloadUrl) {
          throw new Error("Could not load avatar.");
        }
        if (isMounted) {
          setResolvedUrl(body.downloadUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedUrl(null);
          setHasImageError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [avatarUrl]);

  return (
    <div
      aria-label={`${name} avatar`}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-surface-muted font-bold text-ink shadow-sm",
        sizeClassName,
        className
      )}
      role="img"
    >
      {resolvedUrl && !hasImageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
          src={resolvedUrl}
        />
      ) : fallback ? (
        fallback
      ) : (
        <UserRound aria-hidden className="h-1/2 w-1/2 text-ink/45" />
      )}
    </div>
  );
}
