import Link from "next/link";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import type { AnalyticsQuery } from "@/lib/lecturer-analytics";
import { nextSortDirection, queryHref } from "@/lib/lecturer-analytics";

type FilterOption = {
  label: string;
  value: string;
};

export function AnalyticsControls<TSort extends string>({
  action,
  query,
  statusOptions,
  sortOptions,
  exportHref,
  searchLabel = "Search students",
  children
}: {
  action: string;
  query: AnalyticsQuery<TSort>;
  statusOptions?: FilterOption[];
  sortOptions: FilterOption[];
  exportHref: string;
  searchLabel?: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      className="mb-5 grid gap-3 rounded-lg border border-border/80 bg-surface p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto_auto]"
    >
      <label className="grid gap-1 text-sm font-semibold">
        <span className="text-xs uppercase tracking-wide text-ink/55">{searchLabel}</span>
        <input
          className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-moss"
          defaultValue={query.q}
          name="q"
          placeholder="Name or email"
        />
      </label>
      {statusOptions ? (
        <label className="grid gap-1 text-sm font-semibold">
          <span className="text-xs uppercase tracking-wide text-ink/55">Status</span>
          <select
            className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-moss"
            defaultValue={query.status}
            name="status"
          >
            <option value="all">All</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {children}
      <label className="grid gap-1 text-sm font-semibold">
        <span className="text-xs uppercase tracking-wide text-ink/55">Attention</span>
        <select
          className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-moss"
          defaultValue={query.attention}
          name="attention"
        >
          <option value="all">All</option>
          <option value="needs-attention">Needs attention</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        <span className="text-xs uppercase tracking-wide text-ink/55">Sort</span>
        <select
          className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-moss"
          defaultValue={query.sort}
          name="sort"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <input name="dir" type="hidden" value={query.dir} />
        <button
          className="min-h-10 rounded-md bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/85"
          type="submit"
        >
          Apply
        </button>
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-bold hover:bg-surface-muted"
          href={exportHref}
        >
          <Download aria-hidden className="h-4 w-4" />
          CSV
        </Link>
      </div>
    </form>
  );
}

export function SortHeader<TSort extends string>({
  children,
  pathname,
  query,
  sort
}: {
  children: ReactNode;
  pathname: string;
  query: AnalyticsQuery<TSort>;
  sort: TSort;
}) {
  const href = queryHref(
    pathname,
    {
      q: query.q,
      status: query.status,
      attention: query.attention,
      sort: query.sort,
      dir: query.dir
    },
    { sort, dir: nextSortDirection(query, sort) }
  );
  const active = query.sort === sort;

  return (
    <Link className="inline-flex items-center gap-1 hover:text-white/80" href={href}>
      {children}
      {active ? <span aria-hidden>{query.dir === "asc" ? "↑" : "↓"}</span> : null}
    </Link>
  );
}
