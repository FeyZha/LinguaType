"use client";

import { useMemo, useState } from "react";
import type { WritingSetup, WritingTopicArea } from "@/lib/storage";

type WritingSetupPanelProps = {
  initialSetup: WritingSetup | null;
  hasDraft: boolean;
  onSubmit: (setup: WritingSetup) => void;
  onContinue: () => void;
};

type TopicOption = {
  value: WritingTopicArea;
  label: string;
  presets: string[];
};

export const TOPIC_OPTIONS: TopicOption[] = [
  {
    value: "technology",
    label: "科技",
    presets: [
      "人工智能是否会削弱学生的独立思考能力",
      "社交媒体如何影响年轻人的价值观",
      "远程学习是否能替代传统课堂",
      "算法推荐是否限制了人们的信息视野",
      "智能手机对青少年注意力的影响",
      "技术进步是否总能改善生活质量",
      "线上隐私保护为什么越来越重要",
      "数字工具如何改变写作和学习",
      "自动化会给未来就业带来哪些挑战",
      "科技公司应不应该承担更多社会责任",
    ],
  },
  {
    value: "personal_growth",
    label: "个人成长",
    presets: [
      "失败经历如何帮助人成长",
      "自律是否比天赋更重要",
      "年轻人为什么需要培养长期目标",
      "如何在压力中保持学习动力",
      "阅读习惯对个人成长的影响",
      "独处是否有助于自我认识",
      "批判性思维如何影响个人选择",
      "拖延为什么会阻碍长期发展",
      "反馈在能力提升中的作用",
      "适应变化是不是现代人的核心能力",
    ],
  },
  {
    value: "history",
    label: "历史",
    presets: [
      "学习历史是否能帮助人们理解当代社会",
      "历史人物评价应不应该结合时代背景",
      "博物馆在历史教育中的作用",
      "地方历史为什么值得被保存",
      "战争记忆对现代社会的意义",
      "历史影视作品是否会影响公众认知",
      "传统节日如何连接过去与现在",
      "历史教育应更重视事实还是思考",
      "技术如何改变历史研究方式",
      "年轻人为什么容易远离历史学习",
    ],
  },
  {
    value: "art",
    label: "艺术",
    presets: [
      "艺术教育是否应该成为学校核心课程",
      "公共艺术如何改善城市生活",
      "音乐对情绪和学习效率的影响",
      "数字艺术是否改变了创作边界",
      "传统艺术如何吸引年轻观众",
      "艺术作品是否必须承担社会责任",
      "审美能力对个人表达的帮助",
      "商业化会不会削弱艺术价值",
      "博物馆是否应该免费向公众开放",
      "艺术能否促进跨文化理解",
    ],
  },
  {
    value: "education",
    label: "教育",
    presets: [
      "考试成绩是否能真实反映学生能力",
      "学校应不应该更重视实践能力",
      "小组合作对学习效果的影响",
      "家庭教育在学生成长中的作用",
      "在线课程如何改变教育公平",
      "教师反馈为什么比标准答案更重要",
      "大学教育应偏向就业还是通识",
      "学生是否应该学习财务管理",
      "课外活动对学生发展的价值",
      "人工智能工具是否应该进入课堂",
    ],
  },
  {
    value: "society",
    label: "社会",
    presets: [
      "城市化如何改变人际关系",
      "志愿服务是否能增强社会责任感",
      "年轻人就业压力的主要来源",
      "公共交通为什么影响城市公平",
      "媒体素养在现代社会中的重要性",
      "社区关系是否正在变弱",
      "人口老龄化给社会带来的挑战",
      "共享经济是否改善资源利用",
      "网络舆论对公共讨论的影响",
      "社会信任如何影响公共合作",
    ],
  },
  {
    value: "environment",
    label: "环境",
    presets: [
      "个人行动能否真正缓解环境问题",
      "政府是否应该限制一次性塑料制品",
      "城市绿地对居民生活质量的影响",
      "气候变化教育为什么重要",
      "企业应如何承担环保责任",
      "公共交通能否减少城市污染",
      "环保消费是否只适合高收入群体",
      "垃圾分类如何改变公众习惯",
      "可再生能源发展的主要障碍",
      "旅游业如何减少环境破坏",
    ],
  },
  {
    value: "business",
    label: "商业",
    presets: [
      "企业创新是否比成本控制更重要",
      "远程办公如何改变公司管理",
      "品牌信任为什么影响消费者选择",
      "小企业如何在数字时代竞争",
      "企业社会责任是否会带来长期收益",
      "平台经济对传统行业的影响",
      "员工培训是否值得长期投入",
      "价格促销是否会削弱品牌价值",
      "创业失败对商业学习的意义",
      "数据分析如何改变商业决策",
    ],
  },
  {
    value: "custom",
    label: "自定义",
    presets: [
      "一个值得深入讨论的社会现象",
      "一次改变个人看法的经历",
      "某种新趋势对日常生活的影响",
      "一个公共问题的原因与解决方式",
      "个人选择与社会环境之间的关系",
      "某项能力在未来的重要性",
      "一种传统观念是否仍然适用",
      "如何平衡效率与人的需要",
      "某类政策对普通人的影响",
      "一个领域中最值得关注的变化",
    ],
  },
];

export function WritingSetupPanel({
  initialSetup,
  hasDraft,
  onSubmit,
  onContinue,
}: WritingSetupPanelProps) {
  const [topicArea, setTopicArea] = useState<WritingTopicArea>(initialSetup?.topicArea ?? "technology");
  const [customTopicArea, setCustomTopicArea] = useState(initialSetup?.customTopicArea ?? "");
  const [essayTopic, setEssayTopic] = useState(initialSetup?.essayTopic ?? "");
  const [outlinePoints, setOutlinePoints] = useState(
    normalizeInitialOutlinePoints(initialSetup?.outlinePoints ?? initialSetup?.outline),
  );
  const [message, setMessage] = useState("");

  const currentPresets = TOPIC_OPTIONS.find((option) => option.value === topicArea)?.presets ?? TOPIC_OPTIONS[0].presets;
  const canContinue = hasDraft || Boolean(initialSetup);
  const canSubmit = useMemo(() => {
    const hasTopicArea = topicArea !== "custom" || customTopicArea.trim().length > 0;
    return hasTopicArea && essayTopic.trim().length > 0 && outlinePoints.some((point) => point.trim().length > 0);
  }, [customTopicArea, essayTopic, outlinePoints, topicArea]);

  function refreshTopic() {
    const index = Math.floor(Math.random() * currentPresets.length);
    setEssayTopic(currentPresets[index] ?? "");
  }

  function updateOutlinePoint(index: number, value: string) {
    setOutlinePoints((current) => current.map((point, pointIndex) => (pointIndex === index ? value : point)));
  }

  function addOutlinePoint() {
    setOutlinePoints((current) => [...current, ""]);
  }

  function removeOutlinePoint() {
    setOutlinePoints((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function submit() {
    const normalizedPoints = outlinePoints.map((point) => point.trim()).filter(Boolean);
    if (!canSubmit || normalizedPoints.length === 0) {
      setMessage("请先选择领域，并填写文章主题和至少一个大纲点。");
      return;
    }
    onSubmit({
      topicArea,
      customTopicArea: topicArea === "custom" ? customTopicArea : undefined,
      essayTopic,
      outlinePoints: normalizedPoints,
      outline: normalizedPoints.join("\n"),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-4xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">写作准备</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            先确定写作领域、文章主题和大纲，再进入编辑器。这里不会调用大模型，也不会自动生成正文。
          </p>
        </div>

        <div className="mt-6 grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-slate-700">写作领域</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TOPIC_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTopicArea(option.value)}
                  aria-pressed={topicArea === option.value}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    topicArea === option.value
                      ? "border-moss bg-moss/10 font-semibold text-moss"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {topicArea === "custom" ? (
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              自定义领域
              <input
                value={customTopicArea}
                onChange={(event) => setCustomTopicArea(event.target.value)}
                aria-label="自定义领域"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
                placeholder="例如：公共健康、城市规划、媒体伦理"
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            文章主题
            <span className="flex items-center rounded-md border border-slate-300 bg-white focus-within:border-moss">
              <input
                value={essayTopic}
                onChange={(event) => setEssayTopic(event.target.value)}
                aria-label="文章主题"
                className="h-10 min-w-0 flex-1 rounded-md bg-transparent px-3 text-sm text-slate-800 outline-none"
                placeholder="输入主题，或点击右侧按钮抽取预设主题"
              />
              <button
                type="button"
                onClick={refreshTopic}
                aria-label="换一个主题"
                title="换一个主题"
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                换
              </button>
            </span>
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">大纲</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={removeOutlinePoint}
                  disabled={outlinePoints.length <= 1}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  减少
                </button>
                <button
                  type="button"
                  onClick={addOutlinePoint}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  增加
                </button>
              </div>
            </div>
            {outlinePoints.map((point, index) => (
              <label key={index} className="grid gap-1 text-sm font-medium text-slate-700">
                第 {index + 1} 点
                <input
                  value={point}
                  onChange={(event) => updateOutlinePoint(index, event.target.value)}
                  aria-label={`第 ${index + 1} 点`}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
                  placeholder={outlinePlaceholder(index)}
                />
              </label>
            ))}
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss/90"
          >
            进入写作
          </button>
          {canContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              继续上次写作
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function normalizeInitialOutlinePoints(value?: string[] | string): string[] {
  if (Array.isArray(value)) {
    const points = value.length > 0 ? value : ["", "", ""];
    return points.slice(0, 12);
  }
  const points = value?.split(/\r?\n/u).map((point) => point.trim()).filter(Boolean) ?? [];
  return points.length > 0 ? points.slice(0, 12) : ["", "", ""];
}

function outlinePlaceholder(index: number): string {
  if (index === 0) {
    return "例如：提出文章背景或核心立场";
  }
  if (index === 1) {
    return "例如：第一个主要理由";
  }
  if (index === 2) {
    return "例如：补充理由、限制或反方角度";
  }
  return "补充一个大纲点";
}
