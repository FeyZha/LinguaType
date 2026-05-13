"use client";

import { useState } from "react";
import { normalizePersonalDictionary } from "@/lib/proofreading";

type PersonalDictionaryPanelProps = {
  terms: string[];
  onChange: (terms: string[]) => void;
};

export function PersonalDictionaryPanel({ terms, onChange }: PersonalDictionaryPanelProps) {
  const [draft, setDraft] = useState("");

  function addTerm() {
    const next = normalizePersonalDictionary([...terms, draft]);
    onChange(next);
    setDraft("");
  }

  function removeTerm(term: string) {
    onChange(terms.filter((item) => item.toLowerCase() !== term.toLowerCase()));
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <h2 className="text-sm font-semibold text-slate-900">个人词典 Personal Dictionary</h2>
      <p className="mt-1 text-xs text-slate-500">
        把专有名词、品牌名或你认可的表达加入本地词典，轻量校对会减少对应误报。
      </p>

      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="personal-dictionary-term">
          添加 Personal Dictionary 词条
        </label>
        <input
          id="personal-dictionary-term"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTerm();
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          placeholder="例如 LinguaType / IELTS"
        />
        <button
          type="button"
          onClick={addTerm}
          className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white hover:bg-moss/90"
        >
          加入词典
        </button>
      </div>

      {terms.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => (
            <li key={term} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs">
              <span>{term}</span>
              <button
                type="button"
                aria-label={`删除 ${term}`}
                onClick={() => removeTerm(term)}
                className="rounded px-1 font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500">当前没有个人词典词条。</p>
      )}
    </section>
  );
}
