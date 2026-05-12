"use client";

import type { Change } from "diff";

type DiffViewerProps = {
  parts: Change[];
};

export function DiffViewer({ parts }: DiffViewerProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-7">
      {parts.map((part, index) => {
        if (part.removed) {
          return (
            <span key={`${part.value}-${index}`} className="text-slate-400 line-through decoration-2">
              {part.value}
            </span>
          );
        }
        if (part.added) {
          return (
            <span key={`${part.value}-${index}`} className="rounded bg-emerald-100 px-1 text-emerald-900">
              {part.value}
            </span>
          );
        }
        return <span key={`${part.value}-${index}`}>{part.value}</span>;
      })}
    </div>
  );
}
