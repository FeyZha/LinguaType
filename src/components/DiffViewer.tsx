"use client";

import type { Change } from "diff";

type DiffViewerProps = {
  parts: Change[];
};

export function DiffViewer({ parts }: DiffViewerProps) {
  const nodes = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];

    if (part.removed && nextPart?.added) {
      nodes.push(
        <span
          key={`${part.value}-${nextPart.value}-${index}`}
          data-diff-pair="replacement"
          className="mx-0.5 inline-flex items-baseline gap-1 rounded-[4px] bg-[var(--lt-surface)] px-1.5 text-sm"
        >
          <span
            data-diff-part="removed"
            className="text-[var(--lt-muted)] line-through decoration-[var(--lt-muted)] decoration-2"
          >
            {part.value}
          </span>
          <span aria-hidden="true" className="text-[var(--lt-faint)]">
            {"->"}
          </span>
          <span data-diff-part="added" className="text-[var(--lt-accent)]">
            {nextPart.value}
          </span>
        </span>,
      );
      index += 1;
      continue;
    }

    if (part.removed) {
      nodes.push(
        <span
          key={`${part.value}-${index}`}
          data-diff-part="removed"
          className="mx-0.5 text-[var(--lt-muted)] line-through decoration-[var(--lt-muted)] decoration-2"
        >
          {part.value}
        </span>,
      );
      continue;
    }

    if (part.added) {
      nodes.push(
        <span
          key={`${part.value}-${index}`}
          data-diff-part="added"
          className="mx-0.5 rounded-[4px] bg-[var(--lt-accent-soft)] px-1 text-[var(--lt-accent)]"
        >
          {part.value}
        </span>,
      );
      continue;
    }

    nodes.push(<span key={`${part.value}-${index}`}>{part.value}</span>);
  }

  return (
    <div data-diff-viewer="inline-token" className="rounded-md bg-transparent py-1 text-sm leading-7">
      {nodes}
    </div>
  );
}
