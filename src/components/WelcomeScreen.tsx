"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const WELCOME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const WELCOME_WIPE_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const WELCOME_EXIT_DURATION_MS = 980;

function shouldReduceMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function WelcomeScreen({ onStart, theme = "light" }: WelcomeScreenProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const exitTimersRef = useRef<number[]>([]);
  const isLeavingRef = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const queueExitTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      exitTimersRef.current = exitTimersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    exitTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      exitTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldReduceMotion()) {
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
        ease: WELCOME_EASE,
      });
    }

    if (rule) {
      waapi.animate(rule, {
        transform: ["scaleX(0)", "scaleX(1)"],
        transformOrigin: ["left center", "left center"],
        duration: 760,
        delay: 120,
        ease: WELCOME_EASE,
      });
    }

    if (motionItems.length > 0) {
      waapi.animate(motionItems, {
        opacity: [0, 1],
        transform: ["translateY(18px)", "translateY(0px)"],
        duration: 640,
        delay: stagger(64, { start: 120 }),
        ease: WELCOME_EASE,
      });
    }
  }, []);

  const runExitAnimation = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const brand = root.querySelector<HTMLElement>("[data-welcome-brand]");
    const copy = root.querySelector<HTMLElement>("[data-welcome-copy]");
    const actions = root.querySelector<HTMLElement>("[data-welcome-actions]");
    const featureCards = Array.from(root.querySelectorAll<HTMLElement>("[data-welcome-feature-card]"));
    const preview = root.querySelector<HTMLElement>("[data-welcome-preview]");
    const rule = root.querySelector<HTMLElement>("[data-welcome-rule]");
    const startButton = root.querySelector<HTMLElement>("[data-welcome-start-button]");
    const accentWipe = root.querySelector<HTMLElement>("[data-welcome-wipe='accent']");
    const paperWipe = root.querySelector<HTMLElement>("[data-welcome-wipe='paper']");
    const wipeLine = root.querySelector<HTMLElement>("[data-welcome-wipe-line]");

    if (startButton) {
      waapi.animate(startButton, {
        opacity: [1, 0.84],
        transform: ["translateY(0px) scale(1)", "translateY(-2px) scale(0.98)"],
        duration: 180,
        ease: WELCOME_EASE,
      });
    }

    if (featureCards.length > 0) {
      waapi.animate(featureCards, {
        opacity: [1, 0],
        transform: ["translateY(0px) scale(1)", "translateY(18px) scale(0.98)"],
        filter: ["blur(0px)", "blur(7px)"],
        duration: 420,
        delay: stagger(32, { from: "last" }),
        ease: WELCOME_EASE,
      });
    }

    if (actions) {
      waapi.animate(actions, {
        opacity: [1, 0],
        transform: ["translateY(0px)", "translateY(22px)"],
        filter: ["blur(0px)", "blur(8px)"],
        duration: 500,
        delay: 40,
        ease: WELCOME_EASE,
      });
    }

    if (copy) {
      waapi.animate(copy, {
        opacity: [1, 0],
        transform: ["translateY(0px) scale(1)", "translateY(-26px) scale(0.985)"],
        filter: ["blur(0px)", "blur(9px)"],
        duration: 540,
        delay: 70,
        ease: WELCOME_EASE,
      });
    }

    if (preview) {
      waapi.animate(preview, {
        opacity: [1, 0],
        transform: ["translateX(0px) rotateY(0deg) scale(1)", "translateX(-42px) rotateY(-7deg) scale(0.965)"],
        transformOrigin: ["left center", "left center"],
        filter: ["blur(0px)", "blur(10px)"],
        duration: 560,
        delay: 120,
        ease: WELCOME_EASE,
      });
    }

    if (brand) {
      waapi.animate(brand, {
        opacity: [1, 0.92, 0],
        transform: [
          "translate3d(0px, 0px, 0) scale(1)",
          "translate3d(-96px, -12px, 0) scale(0.82)",
          "translate3d(-130px, -18px, 0) scale(0.72)",
        ],
        filter: ["blur(0px)", "blur(0px)", "blur(7px)"],
        duration: 640,
        delay: 80,
        ease: WELCOME_EASE,
      });
    }

    if (rule) {
      waapi.animate(rule, {
        transform: ["scaleX(1)", "scaleX(0)"],
        transformOrigin: ["right center", "right center"],
        opacity: [1, 0],
        duration: 360,
        delay: 110,
        ease: WELCOME_EASE,
      });
    }

    if (accentWipe) {
      waapi.animate(accentWipe, {
        transform: ["translateY(104%)", "translateY(0%)"],
        duration: 520,
        delay: 210,
        ease: WELCOME_WIPE_EASE,
      });
    }

    if (paperWipe) {
      waapi.animate(paperWipe, {
        transform: ["translateY(112%)", "translateY(0%)"],
        duration: 620,
        delay: 320,
        ease: WELCOME_WIPE_EASE,
      });
    }

    if (wipeLine) {
      waapi.animate(wipeLine, {
        opacity: [0, 1, 0],
        transform: ["translateX(-50%) scaleX(0)", "translateX(-50%) scaleX(1)", "translateX(-50%) scaleX(0.7)"],
        duration: 600,
        delay: 270,
        ease: WELCOME_EASE,
      });
    }
  }, []);

  const handleStart = useCallback(() => {
    if (isLeavingRef.current) {
      return;
    }

    if (shouldReduceMotion()) {
      onStart();
      return;
    }

    isLeavingRef.current = true;
    setIsLeaving(true);
    queueExitTimeout(runExitAnimation, 24);
    queueExitTimeout(onStart, WELCOME_EXIT_DURATION_MS);
  }, [onStart, queueExitTimeout, runExitAnimation]);

  return (
    <main
      ref={rootRef}
      aria-label="LinguaType 欢迎页"
      aria-busy={isLeaving}
      data-welcome-state={isLeaving ? "leaving" : "ready"}
      className="relative isolate h-screen overflow-y-auto bg-[var(--lt-bg)] text-[var(--lt-text)]"
    >
      <section className="mx-auto grid min-h-full w-full max-w-[1320px] grid-cols-1 gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:px-12 lg:py-10">
        <div className="flex min-h-[70vh] flex-col justify-between gap-10">
          <div>
            <div data-welcome-brand className="flex items-center gap-3 opacity-0">
              <img
                src={`/brand/linguatype-wordmark-${theme}.png`}
                alt="LinguaType"
                draggable={false}
                className="h-16 w-[300px] select-none object-contain object-left"
              />
            </div>
            <div data-welcome-rule className="mt-5 h-px w-full bg-[var(--lt-border)]" />

            <div data-welcome-motion data-welcome-copy className="mt-12 opacity-0">
              <p className="text-sm font-medium text-[var(--lt-accent)]">产品定位</p>
              <h1 className="mt-4 max-w-[860px] font-serif text-[44px] font-semibold leading-[1.08] tracking-[0] text-[var(--lt-text)] sm:text-[58px]">
                用中文思路，写出自然英文
              </h1>
              <p className="mt-6 max-w-[760px] text-[18px] leading-8 text-[var(--lt-muted)]">
                LinguaType 是一款面向中文母语者的英文写作辅助工具。你可以先用中英混合写下想法，再在原文位置附近获得自然英文改写、修改解释和表达沉淀，让每一次写作都变成可积累的英文表达训练。
              </p>
            </div>
          </div>

          <div data-welcome-motion data-welcome-actions className="grid gap-4 opacity-0">
            <div className="grid gap-3 sm:grid-cols-2">
              {CORE_FEATURES.map((feature) => (
                <div
                  key={feature}
                  data-welcome-feature-card
                  className="rounded-md bg-[var(--lt-surface-soft)] px-4 py-3 text-sm font-medium text-[var(--lt-text)] ring-1 ring-[var(--lt-border)]"
                >
                  {feature}
                </div>
              ))}
            </div>
            <button
              type="button"
              data-welcome-start-button
              onClick={handleStart}
              disabled={isLeaving}
              className="mt-2 w-full rounded-md bg-[var(--lt-text)] px-5 py-4 text-base font-semibold text-[var(--lt-bg)] transition hover:opacity-90 disabled:cursor-default disabled:opacity-80 sm:w-fit"
            >
              {isLeaving ? "正在打开..." : "打开示例文档"}
            </button>
          </div>
        </div>

        <aside
          data-welcome-motion
          data-welcome-preview
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
              示例文档只写入本机浏览器；建议、解释和文章地图已预置，仍不会自动改写正文。
            </p>
          </div>
        </aside>
      </section>
      {isLeaving ? (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          <div
            data-welcome-wipe="accent"
            className="absolute inset-x-0 bottom-0 h-full translate-y-full bg-[#181715]"
          />
          <div
            data-welcome-wipe="paper"
            className="absolute inset-x-0 bottom-0 h-full translate-y-full bg-[var(--lt-bg)]"
          />
          <div
            data-welcome-wipe-line="true"
            className="absolute left-1/2 top-1/2 h-px w-[min(64vw,760px)] -translate-x-1/2 scale-x-0 bg-[var(--lt-accent)] opacity-0"
          />
        </div>
      ) : null}
    </main>
  );
}
