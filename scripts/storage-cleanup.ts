import { db } from "../src/lib/db";
import {
  DEFAULT_STORAGE_CLEANUP_SAFETY_HOURS,
  runStorageCleanup,
  type StorageCleanupSummary
} from "../src/services/storage-cleanup-service";

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const safetyArg = process.argv.find((arg) => arg.startsWith("--safety-hours="));
  const safetyHours = safetyArg
    ? Number.parseInt(safetyArg.replace("--safety-hours=", ""), 10)
    : DEFAULT_STORAGE_CLEANUP_SAFETY_HOURS;

  return {
    dryRun: !args.has("--delete"),
    safetyHours
  };
}

function formatDate(value: Date | null) {
  return value ? value.toISOString() : "unknown";
}

function printSummary(result: StorageCleanupSummary, dryRun: boolean, safetyHours: number) {
  console.info(`Storage cleanup mode: ${dryRun ? "dry-run" : "delete"}`);
  console.info(`Safety window: ${safetyHours} hours`);
  console.info(`Scanned objects: ${result.scanned}`);
  console.info(`Referenced objects: ${result.referenced}`);
  console.info(`Skipped recent objects: ${result.skippedRecent}`);
  console.info(`Orphan candidates: ${result.orphanCandidates}`);
  console.info(`Deleted objects: ${result.deleted}`);

  if (result.candidates.length > 0) {
    console.info("\nCandidates:");
    for (const candidate of result.candidates) {
      console.info(
        `- ${candidate.key} | ${candidate.size} bytes | ${formatDate(candidate.lastModified)} | ${candidate.reason}`
      );
    }
  }

  if (result.deletedKeys.length > 0) {
    console.info("\nDeleted:");
    for (const key of result.deletedKeys) {
      console.info(`- ${key}`);
    }
  }
}

async function main() {
  const { dryRun, safetyHours } = parseArgs();
  const result = await runStorageCleanup({ dryRun, safetyHours });

  printSummary(result, dryRun, safetyHours);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
