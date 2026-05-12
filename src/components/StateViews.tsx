"use client";

export function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-600">
      Please write a sentence before enhancing.
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      Enhancing the latest sentence...
    </div>
  );
}

export function ErrorState({
  message,
  rawResponse,
}: {
  message: string;
  rawResponse?: string;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      <div>{message}</div>
      {rawResponse ? (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Show raw model response</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-red-950">
            {rawResponse}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
