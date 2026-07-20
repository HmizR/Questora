import { ActivityType } from "@prisma/client";

export type SortDirection = "asc" | "desc";

export type AnalyticsQuery<TSort extends string, TStatus extends string = string> = {
  q: string;
  status: TStatus | "all";
  attention: "all" | "needs-attention";
  sort: TSort;
  dir: SortDirection;
};

export function parseAnalyticsQuery<TSort extends string, TStatus extends string = string>(
  searchParams: Record<string, string | string[] | undefined>,
  config: {
    defaultSort: TSort;
    allowedSorts: readonly TSort[];
    allowedStatuses?: readonly TStatus[];
  }
): AnalyticsQuery<TSort, TStatus> {
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const rawSort = value("sort") as TSort | undefined;
  const rawStatus = value("status") as TStatus | "all" | undefined;
  const rawAttention = value("attention");
  const rawDir = value("dir");

  return {
    q: (value("q") ?? "").trim(),
    status:
      rawStatus && rawStatus !== "all" && config.allowedStatuses?.includes(rawStatus as TStatus)
        ? rawStatus
        : "all",
    attention: rawAttention === "needs-attention" ? "needs-attention" : "all",
    sort: rawSort && config.allowedSorts.includes(rawSort) ? rawSort : config.defaultSort,
    dir: rawDir === "desc" ? "desc" : "asc"
  };
}

export function queryHref(
  pathname: string,
  query: Record<string, string | undefined>,
  updates: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...updates })) {
    if (value && value !== "all") {
      params.set(key, value);
    }
  }
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function nextSortDirection<TSort extends string>(
  current: AnalyticsQuery<TSort>,
  sort: TSort
): SortDirection {
  return current.sort === sort && current.dir === "asc" ? "desc" : "asc";
}

export function matchesSearch(input: { name: string; email?: string | null }, q: string) {
  if (!q) return true;
  const term = q.toLowerCase();
  return (
    input.name.toLowerCase().includes(term) || (input.email ?? "").toLowerCase().includes(term)
  );
}

export function compareValues(a: string | number | Date | null, b: string | number | Date | null) {
  const aValue = a instanceof Date ? a.getTime() : a ?? "";
  const bValue = b instanceof Date ? b.getTime() : b ?? "";
  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }
  return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" });
}

export function sortByDirection<T>(
  rows: T[],
  dir: SortDirection,
  selector: (row: T) => string | number | Date | null
) {
  return [...rows].sort((a, b) => {
    const result = compareValues(selector(a), selector(b));
    return dir === "asc" ? result : -result;
  });
}

export function isPastDue(dueAt: Date | null | undefined, now = new Date()) {
  return Boolean(dueAt && dueAt.getTime() < now.getTime());
}

export function missionNeedsAttention(input: {
  type: ActivityType;
  dueAt?: Date | null;
  hasSubmission?: boolean;
  hasGrade?: boolean;
  gradePublishedAt?: Date | null;
  attemptsUsed?: number;
  maxAttempts?: number | null;
  hasPassed?: boolean;
}) {
  if (input.type === ActivityType.ASSIGNMENT || input.type === ActivityType.PROJECT) {
    if (input.hasSubmission && !input.hasGrade) return true;
    if (input.hasGrade && !input.gradePublishedAt) return true;
    if (!input.hasSubmission && isPastDue(input.dueAt)) return true;
  }

  if (input.type === ActivityType.QUIZ) {
    const attemptsExhausted = Boolean(
      input.maxAttempts && (input.attemptsUsed ?? 0) >= input.maxAttempts
    );
    if (!input.hasPassed && attemptsExhausted && (input.attemptsUsed ?? 0) > 0) return true;
    if ((input.attemptsUsed ?? 0) === 0 && isPastDue(input.dueAt)) return true;
  }

  return false;
}

export function csvEscape(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows: Array<Array<string | number | Date | null | undefined>>) {
  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}
