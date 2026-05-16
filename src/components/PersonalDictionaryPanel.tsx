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
    <section className="text-sm text-[#1c1c1c]">
      <h2 className="text-base font-semibold text-[#1c1c1c]">个人词典</h2>
      <p className="mt-1 text-xs leading-5 text-[#1c1c1c]/50">
        把专有名词、品牌名或你认可的表达加入本地词典，轻量校对会减少对应误报。
      </p>

      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="personal-dictionary-term">
          添加个人词典项
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
          className="min-w-0 flex-1 rounded-md bg-black/[0.035] px-3 py-2 text-sm text-[#1c1c1c]/80 outline-none transition placeholder:text-[#1c1c1c]/35 focus:bg-[#fcfbf8] focus:ring-1 focus:ring-black/10"
          placeholder="例如 LinguaType 或 IELTS"
        />
        <button
          type="button"
          onClick={addTerm}
          className="rounded-md bg-[#1c1c1c] px-3 py-2 text-sm font-medium text-[#fcfbf8] transition hover:bg-[#1c1c1c]/85"
        >
          添加词典项
        </button>
      </div>

      {terms.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => (
            <li key={term} className="flex items-center gap-1 rounded-md bg-black/[0.035] px-2 py-1 text-xs text-[#1c1c1c]/70">
              <span>{term}</span>
              <button
                type="button"
                aria-label={`删除 ${term}`}
                onClick={() => removeTerm(term)}
                className="rounded px-1 font-semibold text-[#1c1c1c]/40 transition hover:bg-black/[0.05] hover:text-[#1c1c1c]"
              >
                x
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[#1c1c1c]/45">当前没有个人词典项。</p>
      )}
    </section>
  );
}
