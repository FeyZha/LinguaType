"use client";

export function EmptyState() {
  return (
    <div className="rounded-md bg-black/[0.025] px-4 py-3 text-sm text-[#1c1c1c]/55">
      请先写一句内容，再进行增强。
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-md bg-sky-500/[0.08] px-4 py-3 text-sm text-sky-900">
      正在增强当前句...
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
    <div className="rounded-md bg-red-500/[0.08] px-4 py-3 text-sm text-red-900">
      <div>{message}</div>
      {rawResponse ? (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">查看原始模型响应 raw model response</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[#fcfbf8]/70 p-2 text-xs text-red-950">
            {rawResponse}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
