import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  MANAGED_STORAGE_PREFIXES,
  deleteStorageObject,
  isManagedStorageKey,
  listStorageObjects,
  parseManagedStorageRef,
  type StorageObjectSummary
} from "@/lib/storage";
import { isProtectedStorageRef } from "@/lib/upload-rules";

export const DEFAULT_STORAGE_CLEANUP_SAFETY_HOURS = 72;

export type StorageCleanupCandidate = StorageObjectSummary & {
  reason: "not referenced in database";
};

export type StorageCleanupSummary = {
  scanned: number;
  referenced: number;
  orphanCandidates: number;
  skippedRecent: number;
  deleted: number;
  candidates: StorageCleanupCandidate[];
  deletedKeys: string[];
};

export function collectManagedStorageKeys(refs: Array<string | null | undefined>) {
  const keys = new Set<string>();

  for (const ref of refs) {
    if (!ref || !isProtectedStorageRef(ref)) continue;

    try {
      keys.add(parseManagedStorageRef(ref));
    } catch {
      // Ignore malformed or unmanaged refs; cleanup only protects known managed keys.
    }
  }

  return keys;
}

export function selectStorageCleanupCandidates(params: {
  objects: StorageObjectSummary[];
  referencedKeys: Set<string>;
  now?: Date;
  safetyHours?: number;
}) {
  const now = params.now ?? new Date();
  const safetyHours = params.safetyHours ?? DEFAULT_STORAGE_CLEANUP_SAFETY_HOURS;
  const cutoffMs = now.getTime() - safetyHours * 60 * 60 * 1000;
  const candidates: StorageCleanupCandidate[] = [];
  let skippedRecent = 0;

  for (const object of params.objects) {
    if (!isManagedStorageKey(object.key)) continue;
    if (params.referencedKeys.has(object.key)) continue;

    if (!object.lastModified || object.lastModified.getTime() > cutoffMs) {
      skippedRecent += 1;
      continue;
    }

    candidates.push({
      ...object,
      reason: "not referenced in database"
    });
  }

  return { candidates, skippedRecent };
}

export async function collectReferencedStorageKeys() {
  const [users, submissions, resources] = await Promise.all([
    db.user.findMany({
      where: { avatarUrl: { startsWith: "s3:" } },
      select: { avatarUrl: true }
    }),
    db.submission.findMany({
      where: { fileUrl: { startsWith: "s3:" } },
      select: { fileUrl: true }
    }),
    db.activityResource.findMany({
      where: { fileUrl: { startsWith: "s3:" } },
      select: { fileUrl: true }
    })
  ]);

  return collectManagedStorageKeys([
    ...users.map((user) => user.avatarUrl),
    ...submissions.map((submission) => submission.fileUrl),
    ...resources.map((resource) => resource.fileUrl)
  ]);
}

export async function listManagedStorageObjects() {
  const objectGroups = await Promise.all(
    MANAGED_STORAGE_PREFIXES.map((prefix) => listStorageObjects(prefix))
  );

  return objectGroups.flat();
}

export async function runStorageCleanup(params?: {
  dryRun?: boolean;
  safetyHours?: number;
  now?: Date;
}) {
  const dryRun = params?.dryRun ?? true;
  const safetyHours = params?.safetyHours ?? DEFAULT_STORAGE_CLEANUP_SAFETY_HOURS;

  if (safetyHours < 1) {
    throw new AppError("VALIDATION_ERROR", "Storage cleanup safety window must be at least 1 hour.");
  }

  const [referencedKeys, objects] = await Promise.all([
    collectReferencedStorageKeys(),
    listManagedStorageObjects()
  ]);
  const { candidates, skippedRecent } = selectStorageCleanupCandidates({
    objects,
    referencedKeys,
    now: params?.now,
    safetyHours
  });
  const deletedKeys: string[] = [];

  if (!dryRun) {
    for (const candidate of candidates) {
      await deleteStorageObject(candidate.key);
      deletedKeys.push(candidate.key);
    }
  }

  return {
    scanned: objects.length,
    referenced: referencedKeys.size,
    orphanCandidates: candidates.length,
    skippedRecent,
    deleted: deletedKeys.length,
    candidates,
    deletedKeys
  } satisfies StorageCleanupSummary;
}
