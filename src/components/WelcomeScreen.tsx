"use client";

import { useEffect, useRef } from "react";
import { waapi } from "animejs/waapi";
import { stagger } from "animejs/utils";

type WelcomeScreenProps = {
  onStart: () => void;
  theme?: "light" | "dark";
};

const CORE_FEATURES = [
  "中英文混合输入改写",
  "英文句子润色",
  "修改差异对比",
  "表达问题解释",
  "学习记录沉淀",
  "全文结构线索 / 文章地图",
];

const HOW_TO_USE = [
  "在示例文档中点到任意句子，按 Ctrl/Cmd + Enter 或点侧栏闪光按钮。",
  "看到建议后先对比差异，再决定 Apply 或 Cancel。",
  "选中英文表达可解释、保存到表达库或复制。",
  "写到多段后点“检查文章地图”，再按需要检查本段。",
];

export function WelcomeScreen({ onStart, theme = "light" }: WelcomeScreenProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    const brand = root.querySelector<HTMLElement>("[data-welcome-brand]");
    const motionItems = Array.from(root.querySelectorAll<HTMLElement>("[data-welcome-motion]"));
    const rule = root.querySelector<HTMLElement>("[data-welcome-rule]");

    if (brand) {
      waapi.animate(brand, {
        opacity: [0, 1],
        transform: ["translateY(10px) scale(0.96)", "translateY(0) scale(1)"],
        filter: ["blur(10px)", "blur(0px)"],
        duration: 720,
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }

    if (rule) {
      waapi.animate(rule, {
        transform: ["scaleX(0)", "scaleX(1)"],
        transformOrigin: ["left center", "left center"],
        duration: 760,
        delay: 120,
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }

    if (motionItems.length > 0) {
      waapi.animate(motionItems, {
        opacity: [0, 1],
        transform: ["translateY(18px)", "translateY(0px)"],
        duration: 640,
        delay: stagger(64, { start: 120 }),
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
  }, []);

  return (
    <main
      ref={rootRef}
      aria-label="LinguaType 欢迎页"
      className="h-screen overflow-y-auto bg-[var(--lt-bg)] text-[var(--lt-text)]"
    >
      <section className="mx-auto grid min-h-full w-full max-w-[1320px] grid-cols-1 gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:px-12 lg:py-10">
        <div className="flex min-h-[70vh] flex-col justify-between gap-10">
          <div>
            <div data-welcome-brand className="flex items-center gap-3 opacity-0">
              <img
                src={`/brand/linguatype-mark-${theme}.png`}
                alt=""
                data-welcome-brand-mark
                draggable={false}
                className="h-11 w-11 select-none rounded-md object-contain ring-1 ring-[var(--lt-border)]"
              />
              <img
                src={`/brand/linguatype-wordmark-${theme}.png`}
                alt="LinguaType"
                draggable={false}
                className="h-10 w-[220px] select-none object-contain object-left"
              />
            </div>
            <div data-welcome-rule className="mt-5 h-px w-full bg-[var(--lt-border)]" />

            <div data-welcome-motion className="mt-12 opacity-0">
              <p className="text-sm font-medium text-[var(--lt-accent)]">产品定位</p>
              <h1 className="mt-4 max-w-[860px] font-serif text-[44px] font-semibold leading-[1.08] tracking-[0] text-[var(--lt-text)] sm:text-[58px]">
                面向中文母语者的英文写作辅助工具
              </h1>
              <p className="mt-6 max-w-[760px] text-[18px] leading-8 text-[var(--lt-muted)]">
                围绕中文母语者的英文写作过程，提供中英文混合改写、英文句子润色、修改差异解释、表达沉淀、写作存档与文章地图检查；模型输出始终先作为建议呈现，由用户确认后再应用。
              </p>
            </div>
          </div>

          <div data-welcome-motion className="grid gap-4 opacity-0">
            <div className="grid gap-3 sm:grid-cols-2">
              {CORE_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="rounded-md bg-[var(--lt-surface-soft)] px-4 py-3 text-sm font-medium text-[var(--lt-text)] ring-1 ring-[var(--lt-border)]"
                >
                  {feature}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-2 w-full rounded-md bg-[var(--lt-text)] px-5 py-4 text-base font-semibold text-[var(--lt-bg)] transition hover:opacity-90 sm:w-fit"
            >
              打开示例文档
            </button>
          </div>
        </div>

        <aside
          data-welcome-motion
          aria-label="快速使用说明"
          className="flex min-h-[70vh] flex-col justify-between gap-5 rounded-md bg-[#181715] p-5 text-[#faf9f5] opacity-0 ring-1 ring-black/10 sm:p-6"
        >
          <div className="rounded-md bg-[#252320] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-[#a09d96]">
              <span>Demo archive</span>
              <span>文章地图 · 可检查</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6">
              <p className="text-[#faf9f5]">I cannot clearly 表达这个观点 in English.</p>
              <p className="rounded-md bg-[#1f1e1b] p-3 text-[#d8d2c8] ring-1 ring-white/10">
                建议会出现在当前句附近。你先看差异，再决定是否采纳。
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-[#a09d96]">
                <span className="rounded-md bg-[#1f1e1b] p-2">表达这个观点</span>
                <span>→</span>
                <span className="rounded-md bg-[#1f1e1b] p-2">express this idea clearly</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-[#e8a55a]">如何体验</p>
              <ol className="mt-3 grid gap-3 text-sm leading-6 text-[#d8d2c8]">
                {HOW_TO_USE.map((item, index) => (
                  <li key={item} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-xs text-[#faf9f5]">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="rounded-md bg-white/[0.06] px-3 py-2 text-xs leading-5 text-[#a09d96]">
              示例文档只写入本机浏览器存档，不保存学习数据，也不会自动改写正文。
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
