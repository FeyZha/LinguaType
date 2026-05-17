# AGENTS.md

## Product

LinguaType is a web-based English sentence enhancement and expression input assistant for Chinese-speaking English learners.

LinguaType is not:
- a general translator
- a chatbot
- an essay generator
- a full essay correction or essay scoring tool
- a real system-level input method
- a Chrome extension
- a cloud-sync product

LinguaType is:
- an input-method-like current-sentence enhancer
- a mixed Chinese-English sentence converter
- a light pure-English polishing tool
- an article structure map and paragraph-check scheduling workbench
- a local expression learning assistant
- a local Learning Library and Writing Habits tool

## Current Scope

The current product version is v0.3.1.

v0.3.1 keeps 文章地图 as an Office-outline-style article structure workbench and adds automatic precheck. The system may locally detect structural changes and, when trigger settings and strict idle/rate rules allow it, quietly call `POST /api/check-document-map` to update `linguatype.documentMapCache.v1`. Automatic precheck must not open the panel, rewrite text, score the essay, auto-apply changes, trigger Paragraph Flow, save learning data, or trigger `/api/extract-learning`; it may only update the cache and show a lightweight entry status such as `文章地图 · 可检查`, `文章地图 · 整理中`, `文章地图 · N 个发现`, or `文章地图 · 可能已过期`.

v0.3 adds 文章地图 as a user-opened collapsible document map with overall main idea, structure summary, paragraph roles, paragraph relations, global structure issues, and next actions. It is diagnostic, navigational, and scheduling-oriented only: it must not rewrite the full article, score the essay, auto-apply changes, save learning data, or trigger `/api/extract-learning`.

v0.2.8 refines the main writing shell, Writing Archives, setup editing, archive organization, selection actions, Learning Library, Writing Habits, and low-frequency domain classification. The main writing UI is an immersive writing workbench: the essay topic reads like an H1 in the document flow and can be edited directly, while the main body uses one native long-text writing surface for Word / Typora-like input stability. It keeps the current-sentence enhancement, Apply/Cancel, and learning-data save rules unchanged.

Writing Setup collects topic area, essay topic, and outline before entering the editor. After the user enters the main writing UI, topic area, essay topic, and outline edits should happen through lightweight inline editor controls rather than leaving the editor or opening a setup drawer. Writing Setup is not a landing page or essay generator. It must not call the LLM, generate article content, decide the user's argument, save learning data, or rewrite text by itself.

Writing Setup uses direct topic-area buttons, local preset essay topics, and multiple outline point inputs. Preset topic refresh is local only and must not call the LLM.

The main writing UI must not split the body into outline-driven input cards. Outline data may remain in Writing Setup and archive metadata, but the writing page body is one continuous text surface. Essay topic H1 and setup metadata must not be mixed into the正文 `text` used for sentence extraction.

Writing Archives store local writing drafts as separate local documents. They are localStorage-only, may save title, text, setup, createdAt, updatedAt, and lastOpenedAt, and must not save learning data or trigger extraction. The archive sidebar may be collapsible. Archive item menus may support rename and delete. Archive delete must require confirmation, must only update `linguatype.writingArchives.v1`, and must not clear Learning Library, Correction Events, legacy draft/setup keys, or trigger `/api/extract-learning`. Archive title rename must not automatically change the essay topic.

Outline Check uses `POST /api/check-outline` only after the user confirms inline topic or outline changes. Editing, adding, deleting, opening archive menus, switching archives, deleting archives, or refreshing outline fields must not call the LLM. Outline Check is non-blocking, only checks whether the outline matches the essay topic, only shows suggestions when issues exist, and must not rewrite the outline or generate article content.

Article Map may call `POST /api/check-document-map` in two ways: manual user checks and automatic prechecks. A manual `检查文章地图` click may open the collapsible outline panel; an automatic precheck may run only after local freshness detection, minimum paragraph/word thresholds, user idle time, change thresholds, request-activity checks, API availability, interval throttling, session caps, and trigger-setting permission all pass. Automatic precheck updates cache and entry status only; it must not open Article Map, locate paragraphs, trigger Paragraph Flow, call `/api/check-paragraph-flow`, or call `/api/extract-learning`. The frontend must keep the body as one continuous text surface, split paragraphs only for range metadata, and show the result as a lightweight collapsible outline panel near the editor or in the middle writing stage only after the user opens it. On wide screens, Article Map should use a temporary side-by-side comparison layout with the map and the editor visible together; it must not push the editor far below the fold or become a persistent right-side management panel. In that comparison layout, the map pane and source-text pane should scroll independently, hide visible scrollbars, and prevent source-text scrolling from moving the map pane. Paragraph detection should treat blank lines as explicit separators, and when the article has no blank-line separators, single manual line breaks between non-empty blocks should count as paragraph breaks for Article Map and metadata counts. Article Map may show full-document main idea, structure judgment, global structure issues, paragraph roles, paragraph relations, paragraph health summaries, and next actions. It must not return `revisedDocument`, full-article rewrites, essay scores, learning items, correction events, or automatically applicable replacement text. Paragraph-node `查看建议` must reuse Paragraph Health boundaries only and display the result inline inside the paragraph card; it must not show a separate bottom-right health popup or trigger Paragraph Flow or `/api/check-paragraph-flow`. `检查本段` must reuse Paragraph Flow boundaries for the current paragraph only and open an Article Map secondary check view rather than a bottom page panel.

Theme Preference supports `light`, `dark`, and `system`. It belongs in the main writing UI only, is UI-only, and must not affect API Settings, LLM provider behavior, Learning Library, Correction Events, Paragraph Health, or Selection Actions. The main UI theme control should remain a lightweight top-right block with only `深色`, `浅色`, and `跟随系统` choices.

Current Sentence suggestions should appear near the editor as an inline suggestion card when possible. Chinese placeholders should first surface as low-distraction sentence-side markers after a complete stable sentence, then expand only after the user opens the marker. Suggestions must remain suggestions, not applied text, until the user explicitly clicks Apply.

Expression Reappearance Cues are passive learning reinforcement. When the user naturally writes a high-value phrase or collocation already stored in the local expression library, the matching text may show one very light inline cue with a card-stamp one-shot animation. This cue is visual-only and must not become a recommendation, candidate list, proofreading warning, AI suggestion marker, hover card, focusable element, or text rewrite action.

v0.2.2 preserves the core flow:
current sentence -> `/api/enhance-fast` -> code-generated diff -> Apply/Cancel -> immediate editor replacement -> background learning extraction after Apply.

High-frequency UI belongs near the editor. Low-frequency management belongs in left-side navigation or top-right utility entry points that open middle-stage pages: `表达库`, `写作习惯`, `数据管理`, `触发设置`, `快捷键帮助`, and `API 设置`. The right side must not regrow a persistent management sidebar; status and paragraph feedback should appear near the editor.

User-facing UI copy should be Chinese by default for Chinese-speaking English learners. Do not use decorative Chinese-English side-by-side labels such as `数据管理 Data Control`, `句子长度 Sentence length`, or `表达库 Learning Library`. Keep English only when it is a necessary technical term, API field, model setting, JSON/localStorage label, shortcut, or user-written content.

## Project Docs

Use these docs for current structure and handoff context:
- `PRODUCT.md`: product identity, target user, current scope, and non-goals.
- `ARCHITECTURE.md`: current app layers, data flow, storage model, and provider abstraction.
- `MODULES.md`: module ownership, file mapping, dependency direction, and boundary rules.
- `CHANGELOG.md`: high-level product and documentation milestones.

`AGENTS.md` remains the source of truth for product constraints and agent execution rules. Do not duplicate long architecture narratives here; update the dedicated docs instead.

## Token-saving workflow

- Prefer reading and editing the smallest relevant set of files.
- Do not run long-lived commands such as `npm run dev` unless explicitly requested.
- Do not run `npm install`, `pnpm install`, `yarn install`, or dependency updates unless explicitly requested.
- Do not inspect lock files such as `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` unless dependency debugging is required.
- Prefer targeted tests over full test suites.
- Avoid broad recursive commands over the whole repo. Search inside `src/` first and limit results.
- When running build, lint, typecheck, or tests, limit output:
  - redirect full logs to a temp file when output may be large
  - show only the key error lines or the final 80-150 lines
  - preserve the original exit code
- After each change, summarize only:
  1. files changed
  2. key behavior changed
  3. known risks
  4. minimal verification performed

## Core Interaction Rules

1. Process only the current sentence around the cursor for current-sentence enhancement.
2. Do not require `/` or any trigger prefix.
3. Do not require selected text for current-sentence enhancement.
4. Do not ask the user to choose among Chinese segments.
5. If the current sentence contains Chinese, convert all Chinese segments and polish the sentence.
6. If the current sentence contains no Chinese, lightly polish it; unchanged output is valid.
7. Use previous context only for tone, meaning, and coherence reference.
8. Never rewrite the whole paragraph through current-sentence enhancement.
9. Never generate new arguments or decide the user's writing direction.
10. Never auto-apply model output.
11. Save learning data only after explicit user action.
12. Diff highlighting must be generated by code, never by the model.
13. User-facing operation guidance, buttons, settings, empty states, and status messages should use Chinese first. Preserve English only for necessary technical terms, API fields, model settings, JSON/localStorage labels, shortcuts, or user-written content.

## Shortcuts And Trigger Settings

Sentence-enhancement triggers are stored in `linguatype.triggerSettings.v1`.

Supported sentence-enhancement triggers:
- `ctrl_enter`: Ctrl/Cmd + Enter
- `button_only`: no sentence shortcut, button remains active

Current paragraph-flow shortcut:
- Ctrl/Cmd + K directly runs `检查本段` for the current paragraph.

Document Map automatic precheck modes are stored in `linguatype.triggerSettings.v1`:
- `off`: never run automatic Article Map checks.
- `remind_only`: only mark local freshness and show whether Article Map is checkable or stale; do not call the model automatically.
- `auto_idle`: after strict local eligibility, idle time, request-activity checks, interval throttling, and session caps pass, quietly update the Article Map cache in the background.
- `manual_first`: generate Article Map only after the user clicks, and mark stale/checkable state after text changes.

Rules:
1. Do not restore plain `/` or `Alt + /` as an activation trigger.
2. Plain `/` and `Alt + /` must remain inactive.
3. Do not restore the old Inline Expression Menu, `ctrl_k` / `floating_button` / `disabled` menu trigger settings, or menu-based template insertion.
4. Shortcut logic must not break text selection, current sentence detection, current paragraph detection, or range replacement.
5. Removed legacy values such as `ctrl_j_legacy` must migrate to `ctrl_enter`; Ctrl/Cmd + J must remain inactive.

## Editor State And Replacement

Use range-based replacement only.

Enhancement request state must include requestId, snapshotFullText, captured current-sentence range (`latestSentenceRange` in current code), originalSentence, requestInput, and result.

On Apply:
1. If current editor text differs from `snapshotFullText`, do not apply automatically.
2. Show conflict warning and ask the user to enhance again.
3. If no conflict, replace only the captured current sentence range.
4. Preserve spacing around replacement.

Never use string replacement for current sentence replacement because duplicate earlier sentences may exist.

Draft behavior:
- auto-save editor text to localStorage
- restore saved draft on page load

## localStorage Keys

Current keys: `linguatype.apiSettings.v1`, `linguatype.writingDraft.v1`, `linguatype.writingSetup.v1`, `linguatype.writingArchives.v1`, `linguatype.themeSettings.v1`, `linguatype.learningLibrary.v1`, `linguatype.correctionEvents.v1`, `linguatype.paragraphHealthCache.v1`, `linguatype.placeholderSuggestionCache.v1`, `linguatype.documentMapCache.v1`, `linguatype.triggerSettings.v1`, `linguatype.personalDictionary.v1`.

Legacy keys: `linguatype.learningHistory.v1`, `linguatype.correctionMemory.v1`.

Migration rules:
1. Migrate legacy learning history into Learning Library without deleting the old key.
2. Migrate legacy correction memory into Correction Events without deleting the old key.
3. Fill missing legacy fields with safe defaults.
4. Migrate existing draft/setup into Writing Archives without deleting the old keys.
5. Keep all v0.x data local; do not add a backend store.

## API Routes

Primary routes: `POST /api/enhance-fast`, `POST /api/extract-learning`, `POST /api/check-paragraph-health`, `POST /api/check-paragraph-flow`, `POST /api/check-outline`, `POST /api/check-document-map`, `POST /api/explain-selection`, `POST /api/test-connection`.

Legacy route: `POST /api/enhance-latest-sentence`.

`/api/enhance-fast` returns only originalSentence, finalSentence, explanationZh, taskType, and hasChinese.

`/api/enhance-fast` must not return learningItems, corrections, correctionEvents, coherenceRisk, Markdown, HTML, or multiple candidates.

`/api/extract-learning` runs only after Apply for a current-sentence suggestion. It may return learningItems and correctionEvents.

`/api/check-paragraph-health` is lightweight only. It must not return `revisedParagraph`, generate a diff, save learning data, or auto-apply.

`/api/check-paragraph-flow` is full manual paragraph flow suggestions for the current paragraph. It may return `revisedParagraph` and `detailIssues` for grammar, spelling, punctuation, article, tense, word form, preposition, collocation, and spacing details, but only after explicit user action and never auto-applies.

`/api/check-document-map` is full-document structure diagnosis only. Its request includes `trigger: "manual" | "auto_idle" | "after_apply" | "after_outline_change"`. Manual requests may return the full Article Map; `auto_idle` requests should stay concise and prioritize high-value structure findings for cache preheating. All triggers may return overallMainIdeaZh, structureSummaryZh, paragraphs, globalIssues, and nextActions, but must not return `revisedDocument`, full-document rewrite text, essay scoring fields, learningItems, correctionEvents, or auto-apply payloads.

`/api/explain-selection` explains selected text only. It must not rewrite selected text, return replacement text, trigger latest, or trigger learning extraction.

## LLM Provider Abstraction

Product logic must not call vendor APIs directly.

Use provider service functions: `enhanceFastWithLLM`, `extractLearningWithLLM`, `checkParagraphHealthWithLLM`, `checkParagraphFlowWithLLM`, `checkDocumentMapWithLLM`, `explainSelectionWithLLM`, and legacy-only `enhanceLatestSentenceWithLLM`.

Provider-specific code belongs under `src/lib/llm/providers/`.
Prompts belong in `src/lib/llm/prompts.ts`.
Shared schemas and types belong in `src/lib/llm/types.ts`.

Provider rules:
1. Never hardcode, log, commit, or server-persist API keys.
2. API settings are sent to Next.js API routes per request.
3. `supportsJsonMode` defaults to false.
4. Users may enable JSON mode manually.
5. Use robust JSON parsing and zod validation for model outputs.
6. Redact API keys from displayed errors and internal error objects.
7. Mock Mode must be deterministic and require no Base URL, API Key, or Model.
8. `/api/test-connection` uses only a minimal prompt asking for `{"ok": true}`.

## 表达库

表达库保存用户真实采纳、明确保存、可再次调取的表达资产，不是整句复制仓库。

It must support search, filter, favorite, copy, insert, delete, and JSON export.

Save rules:
1. Current-sentence learningItems are saved only after Apply and background extraction.
2. Selection Actions may save selected text only when the user explicitly clicks Save to Library.
3. Deduplicate by `type + normalized content`.
4. Normalization must trim whitespace and compare case-insensitively.
5. Duplicate items increment `useCount` and update `updatedAt` / `lastUsedAt`.
6. Do not save empty content.
7. Do not save items with empty meaning and empty usage note.

## Expression Reappearance Cues

Expression Reappearance Cues help users notice that they have naturally reused an expression from their own 表达库.

Rules:
1. Match only local `phrase` and `collocation` Learning Library items.
2. Do not match ordinary single words, short fragments, personal dictionary entries, or whole paragraphs.
3. Use local deterministic matching only; do not call the LLM or any API route.
4. Do not modify editor text, auto-insert expressions, or save new learning data.
5. In one sentence, show at most one expression reappearance cue.
6. In one document session, animate the same expression only once; later matches must stay quiet without a persistent mark.
7. Visual language must stay independent from AI suggestion markers and Article Map / paragraph-check status.
8. Do not show a hover/focus explanation card for the cue.

## Correction Events 与 写作习惯

Correction Events are the data layer for correction signals.
写作习惯是基于 Correction Events 的聚合洞察，不是原始日志列表。

Correction Events save rules:
1. Save only after Apply and successful background extraction.
2. Do not save on Regenerate, Copy revised sentence, Cancel, Paragraph Flow, or Selection Explain.
3. Deduplicate by normalized `before + after + type`.
4. Do not save empty events.
5. Do not save events where before and after are the same.

写作习惯 UI:
1. Show aggregated habit insights by type.
2. Do not restore raw common issue logs as the default UI.
3. Keep 写作习惯 distinct from 表达库.
4. Export 写作习惯 JSON should export aggregated insights by default.

## Paragraph Health And Paragraph Flow

Paragraph Health trigger modes: `after_every_apply` and `after_paragraph_complete`.

Paragraph Health is always enabled. It must not expose `manual_only` or `off`; legacy `manual_only` and `off` values should migrate to `after_every_apply`, and legacy `after_3_applied_edits` should migrate to `after_paragraph_complete`.

When the mode is `after_every_apply`, Paragraph Health may run after current-sentence Apply. When the mode is `after_paragraph_complete`, Paragraph Health may run once after a paragraph is completed by an empty-line paragraph break.

Paragraph Health may run only when the paragraph has at least two sentences, the same paragraph is not already running a health check, the same paragraph is not already running a Paragraph Flow check, the same paragraph is outside the 30-second health-check throttle window, and cache checks pass. Do not require a minimum of 40 English words.

Paragraph Health must not interrupt writing, return `revisedParagraph`, generate a diff, save learning data, auto-apply, score essays, or show a separate bottom-right popup. When the user asks from Article Map, its lightweight result should render inside that paragraph card.

Full Paragraph Flow Check:
1. Is manual only.
2. Checks only the current paragraph.
3. Loads full suggestions only after explicit user action.
4. May report both paragraph-level flow issues and local detail issues such as grammar, spelling, punctuation, article, tense, word form, preposition, collocation, and spacing.
5. Enters the Article Map secondary check view, including visible running state while the model is responding.
6. Apply Paragraph replaces only the checked paragraph.
7. Apply Paragraph must use conflict detection.
8. Apply Paragraph must not trigger learning extraction or a health-check loop.

## Check Current Paragraph

`检查本段` is the direct manual entry point for Full Paragraph Flow Check.

Rules:
1. Ctrl/Cmd + K must trigger `检查本段` directly.
2. The collapsed archive sidebar must expose a small icon button for `检查本段` near the current-sentence enhancement button.
3. Do not show an Inline Expression Menu popup.
4. Do not reintroduce static template insertion or expression-library insertion through an editor popup.
5. 表达库 remains available as its own low-frequency page, and Selection Actions may still save selected text to 表达库.

## Text Proofreading Removal

Text proofreading is no longer a standalone writing-area feature.

Rules:
1. Do not show right-side proofreading tags, a bottom-right proofreading card, or a bottom status item such as `文本校对：N 条提示`.
2. Do not run local duplicate-word, punctuation-spacing, typo, style, or long-sentence proofreading analysis as an editor feedback loop.
3. Keep word, sentence, and paragraph stats in the fixed editor bottom status bar.
4. Use the former proofreading status position for Article Map status and entry, such as `检查文章地图`, `文章地图 · 整理中`, or `文章地图 · N 个发现`.
5. Detail checks for grammar, spelling, punctuation, article, tense, word form, preposition, and collocation belong in the user-triggered `检查本段` secondary view.
6. Do not fill the detail issue list with spacing-only or trivial formatting items; hide or summarize them instead.
7. 个人词典 is stored locally in `linguatype.personalDictionary.v1`, remains a type/category inside `表达库`, and is not a standalone navigation feature.

## Selection Actions

Selection Actions are intentionally limited to Explain selected, Save to Library, and Copy selected text.

Do not implement Polish selected, Find alternatives, selected text rewriting, or automatic selected text replacement.

Explain selected:
1. Calls `/api/explain-selection`.
2. Does not modify editor text.
3. Does not save learning data by itself.
4. Shows structured explanation in Chinese-first UI.
5. The popover should follow the selected text position and avoid covering the selection when possible.

Save to Library:
1. Is explicit user intent.
2. May save selected text to `linguatype.learningLibrary.v1`.
3. Maps `word` and `phrase` to `phrase`.
4. Maps `collocation` to `collocation`.
5. Maps `sentence_pattern` and `sentence` to `sentence_pattern`.

## 数据管理

数据管理属于低频中间舞台页面，必须与主写作面分离。API 设置和触发/打扰设置可以使用各自的低频页面或右上角工具入口，但不能变成常驻编辑器侧栏。

Supported local actions: export expression library JSON, export writing habits JSON, clear expression library, clear writing habits, reset API settings, and view localStorage keys.

Rules:
1. Clear actions require confirmation.
2. Clear 表达库 clears only `linguatype.learningLibrary.v1`.
3. Clear 写作习惯 clears only `linguatype.correctionEvents.v1`.
4. Do not delete legacy keys from clear actions.
5. Do not add import, cloud sync, login, database, or payment.
6. 保存/清空/重置/测试等动作在低频设置页给中文优先状态反馈；测试失败显示脱敏 key 上下文；不改变 provider 请求形态。

## OpenSpec Workflow

Use OpenSpec for non-trivial product, architecture, API, storage, or interaction changes before implementation.

Rules:
1. Keep this `AGENTS.md` file as the source of truth for LinguaType product constraints.
2. Put OpenSpec change artifacts under `openspec/changes/<change-name>/`.
3. Use `/opsx:propose "<change summary>"` to create a proposal, design, and tasks before implementation.
4. Implement only after the OpenSpec tasks are clear and consistent with the current product scope.
5. Archive completed changes with `/opsx:archive` when the work is done.
6. Write future OpenSpec proposals, designs, tasks, and specs in Chinese by default; keep code paths, API routes, schema names, commands, localStorage keys, and product capability names in English when useful.

## Testing And Verification

Before considering a task complete, choose the smallest verification that matches the change and risk. Prefer targeted tests or type checks over full suites. Run `npm test`, `npm run lint`, and `npm run build` only when explicitly requested, before release-level handoff, or when the change is broad enough to justify full verification.

Acceptance coverage must include:
- mixed Chinese-English current sentence
- pure English polishing and unchanged output
- multiple Chinese segments in one sentence
- range replacement with duplicate earlier sentences
- Apply / Cancel / Regenerate / Copy behavior
- background learning extraction only after Apply
- Learning Library deduplication
- Expression Reappearance Cues behavior
- Correction Events and Writing Habits aggregation
- trigger modes and cache/throttle behavior
- Article Map status-bar entry and paragraph-check detail filtering
- Selection Actions behavior
- Mock Mode
- API Settings
- API key redaction
- invalid model JSON handling

## Hard Non-Goals

Do not implement:
- login
- database
- payment
- cloud sync
- Chrome extension
- real system input method
- social features
- spaced repetition
- full essay correction
- essay scoring
- automatic continuation
- automatic paragraph rewrite
- automatic high-frequency LanguageTool public API checks
- selected text rewriting
- multi-candidate translation UI
- chatbot interface
- large dashboard
