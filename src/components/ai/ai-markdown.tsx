"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function normalizeLatexDelimiters(content: string) {
  return content
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_match, math: string) => `$$\n${math.trim()}\n$$`)
    .replace(/\\\((.+?)\\\)/g, (_match, math: string) => `$${math}$`);
}

export function AIMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        a: ({ children, href }) => (
          <a
            className="font-semibold text-moss underline decoration-moss/30 underline-offset-2 hover:text-ink"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-ink/10 px-1.5 py-0.5 text-[0.92em] font-semibold">
            {children}
          </code>
        ),
        h1: ({ children }) => <h3 className="mt-3 text-base font-bold first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="mt-3 text-base font-bold first:mt-0">{children}</h3>,
        h3: ({ children }) => <h4 className="mt-3 text-sm font-bold first:mt-0">{children}</h4>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        pre: ({ children }) => (
          <pre className="my-3 max-w-full overflow-x-auto rounded-lg border border-border/80 bg-ink/10 p-3 text-xs leading-5">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[320px] text-left text-xs">{children}</table>
          </div>
        ),
        tbody: ({ children }) => <tbody className="divide-y divide-border/80">{children}</tbody>,
        td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
        th: ({ children }) => (
          <th className="bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink/55">
            {children}
          </th>
        ),
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
      }}
    >
      {normalizeLatexDelimiters(content)}
    </ReactMarkdown>
  );
}
