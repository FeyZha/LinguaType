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
- an input-method-like latest-sentence enhancer
- a mixed Chinese-English sentence converter
- a light pure-English polishing tool
- a local lightweight proofreading signals tool
- a local expression learning assistant
- a local Learning Library and Writing Habits tool

## Current Scope

The current product version is v0.2.8.

v0.2.8 refines the main writing shell, Writing Archives, setup editing, archive organization, selection actions, Learning Library, Writing Habits, and low-frequency domain classification. The main writing UI is an immersive Typora-like integrated workbench: the essay topic reads like an H1 in the document flow and can be edited directly, outline points read like paragraph headings, and paragraph body blocks use a writing-first `contentEditable` document surface instead of textarea cards. It keeps the latest-sentence enhancement, Apply/Cancel, and learning-data save rules unchanged.

Writing Setup collects topic area, essay topic, and outline before entering the editor. After the user enters the main writing UI, topic area, essay topic, and outline edits should happen through lightweight inline editor controls rather than leaving the editor or opening a setup drawer. Writing Setup is not a landing page or essay generator. It must not call the LLM, generate article content, decide the user's argument, save learning data, or rewrite text by itself.

Writing Setup uses direct topic-area buttons, local preset essay topics, and multiple outline point inputs. Preset topic refresh is local only and must not call the LLM.

The main writing UI may show segmented paragraph blocks based on outline points, but the product still preserves the latest-sentence enhancement contract and range-based Apply behavior. The main UI must not show a separate article-outline management card; outline points should be shown as Typora-like paragraph headings with a low-emphasis inline edit entry. Essay topic H1 and outline headings must not be mixed into the正文 `text` used for latest-sentence extraction.

Writing Archives store local writing drafts as separate local documents. They are localStorage-only, may save title, text, setup, createdAt, updatedAt, and lastOpenedAt, and must not save learning data or trigger extraction. The archive sidebar may be collapsible. Archive item menus may support rename and delete. Archive delete must require confirmation, must only update `linguatype.writingArchives.v1`, and must not clear Learning Library, Correction Events, legacy draft/setup keys, or trigger `/api/extract-learning`. Archive title rename must not automatically change the essay topic.

Outline Check uses `POST /api/check-outline` only after the user confirms inline topic or outline changes. Editing, adding, deleting, opening archive menus, switching archives, deleting archives, or refreshing outline fields must not call the LLM. Outline Check is non-blocking, only checks whether the outline matches the essay topic, only shows suggestions when issues exist, and must not rewrite the outline or generate article content.

Theme Preference supports `light`, `dark`, and `system`. It belongs in the main writing UI only, is UI-only, and must not affect API Settings, LLM provider behavior, Learning Library, Correction Events, Paragraph Health, or Selection Actions. The main UI theme control should remain a lightweight top-right block with only `深色`, `浅色`, and `跟随系统` choices.

Current Sentence suggestions should appear near the editor as an inline diff suggestion bar when possible. They must remain suggestions, not applied text, until the user explicitly clicks Apply.

v0.2.2 preserves the core flow:
latest sentence -> `/api/enhance-fast` -> code-generated diff -> Apply/Cancel -> immediate editor replacement -> background learning extraction after Apply.

High-frequency UI belongs near the editor. Low-frequency management belongs in left-side navigation that opens middle-stage pages: `表达库 Learning Library`, `写作习惯 Writing Habits`, and unified `设置`. The right side must not regrow a persistent management sidebar; status and paragraph feedback should appear near the editor.

User-facing UI copy should be Chinese-first for Chinese-speaking English learners. Keep feature names in English when they are product capability names, and write key terms bilingually, for example `表达库 Learning Library`, `写作习惯 Writing Habits`, `当前句建议 Current Sentence`, and `API Settings 设置`.

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

1. Process only the latest non-empty sentence for.
2. Do not require `/` or any trigger prefix.
3. Do not require selected text for latest-sentence enhancement.
4. Do not ask the user to choose among Chinese segments.
5. If the latest sentence contains Chinese, convert all Chinese segments and polish the sentence.
6. If the latest sentence contains no Chinese, lightly polish it; unchanged output is valid.
7. Use previous context only for tone, meaning, and coherence reference.
8. Never rewrite the whole paragraph through latest-sentence enhancement.
9. Never generate new arguments or decide the user's writing direction.
10. Never auto-apply model output.
11. Save learning data only after explicit user action.
12. Diff highlighting must be generated by code, never by the model.
13. User-facing operation guidance, buttons, settings, empty states, and status messages should use Chinese first, with English capability names preserved where helpful.

## Shortcuts And 

 are stored in `linguatype.triggerSettings.v1`.

Supported triggers:
- `ctrl_enter`: Ctrl/Cmd + Enter
- `ctrl_j_legacy`: Ctrl/Cmd + J, editor-focused only, must call `preventDefault`
- `button_only`: no sentence shortcut, button remains active

Supported triggers:
- `ctrl_k`
- `floating_button`
- `disabled`

Rules:
1. Do not restore plain `/` trigger.
2. Plain `/` and `Alt + /` triggers are not active in v0.2.2.
3. If inline trigger is `disabled`, hide shortcut and floating entry paths.
4. Shortcut logic must not break text selection, latest sentence detection, or range replacement.

## Editor State And Replacement

Use range-based replacement only.

Enhancement request state must include requestId, snapshotFullText, latestSentenceRange, originalSentence, requestInput, and result.

On Apply:
1. If current editor text differs from `snapshotFullText`, do not apply automatically.
2. Show conflict warning and ask the user to enhance again.
3. If no conflict, replace only the captured latest sentence range.
4. Preserve spacing around replacement.

Never use string replacement for latest sentence replacement because duplicate earlier sentences may exist.

Draft behavior:
- auto-save editor text to localStorage
- restore saved draft on page load

## localStorage Keys

Current keys: `linguatype.apiSettings.v1`, `linguatype.writingDraft.v1`, `linguatype.writingSetup.v1`, `linguatype.writingArchives.v1`, `linguatype.themeSettings.v1`, `linguatype.learningLibrary.v1`, `linguatype.correctionEvents.v1`, `linguatype.paragraphHealthCache.v1`, `linguatype.triggerSettings.v1`, `linguatype.personalDictionary.v1`.

Legacy keys: `linguatype.learningHistory.v1`, `linguatype.correctionMemory.v1`.

Migration rules:
1. Migrate legacy learning history into Learning Library without deleting the old key.
2. Migrate legacy correction memory into Correction Events without deleting the old key.
3. Fill missing legacy fields with safe defaults.
4. Migrate existing draft/setup into Writing Archives without deleting the old keys.
5. Keep all v0.2.x data local; do not add a backend store.

## API Routes

Primary routes: `POST /api/enhance-fast`, `POST /api/extract-learning`, `POST /api/check-paragraph-health`, `POST /api/check-paragraph-flow`, `POST /api/check-outline`, `POST /api/explain-selection`, `POST /api/test-connection`.

Legacy route: `POST /api/enhance-latest-sentence`.

`/api/enhance-fast` returns only originalSentence, finalSentence, explanationZh, taskType, and hasChinese.

`/api/enhance-fast` must not return learningItems, corrections, correctionEvents, coherenceRisk, Markdown, HTML, or multiple candidates.

`/api/extract-learning` runs only after Apply for a latest-sentence suggestion. It may return learningItems and correctionEvents.

`/api/check-paragraph-health` is lightweight only. It must not return `revisedParagraph`, generate a diff, save learning data, or auto-apply.

`/api/check-paragraph-flow` is full manual paragraph flow suggestions. It may return `revisedParagraph`, but only after explicit user action and never auto-applies.

`/api/explain-selection` explains selected text only. It must not rewrite selected text, return replacement text, trigger latest, or trigger learning extraction.

## LLM Provider Abstraction

Product logic must not call vendor APIs directly.

Use provider service functions: `enhanceFastWithLLM`, `extractLearningWithLLM`, `checkParagraphHealthWithLLM`, `checkParagraphFlowWithLLM`, `explainSelectionWithLLM`, and legacy-only `enhanceLatestSentenceWithLLM`.

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

## Learning Library

Learning Library stores reusable expression assets.

It must support search, filter, favorite, copy, insert, delete, and JSON export.

Save rules:
1. Latest-sentence learningItems are saved only after Apply and background extraction.
2. Selection Actions may save selected text only when the user explicitly clicks Save to Library.
3. Deduplicate by `type + normalized content`.
4. Normalization must trim whitespace and compare case-insensitively.
5. Duplicate items increment `useCount` and update `updatedAt` / `lastUsedAt`.
6. Do not save empty content.
7. Do not save items with empty meaning and empty usage note.

## Correction Events And Writing Habits

Correction Events are the data layer.
Writing Habits are aggregated insights, not raw logs.

Correction Events save rules:
1. Save only after Apply and successful background extraction.
2. Do not save on Regenerate, Copy revised sentence, Cancel,, Paragraph Flow, or Selection Explain.
3. Deduplicate by normalized `before + after + type`.
4. Do not save empty events.
5. Do not save events where before and after are the same.

Writing Habits UI:
1. Show aggregated habit insights by type.
2. Do not restore raw Common Issues as the default UI.
3. Keep Writing Habits distinct from Learning Library.
4. Export Writing Habits JSON should export aggregated insights by default.

## And Paragraph Flow

Paragraph Health trigger modes: `after_every_apply`, `after_3_applied_edits`, `manual_only`, and `off`.

Paragraph Health may run after latest-sentence Apply only when the selected mode allows it, the paragraph is long enough, it has at least two sentences, cache/throttle checks pass, and no paragraph check is running.

Paragraph Health must not interrupt writing, return `revisedParagraph`, generate a diff, save learning data, auto-apply, or score essays.

Full Paragraph Flow Check:
1. Is manual only.
2. Checks only the current paragraph.
3. Loads full suggestions only after explicit user action.
4. Apply Paragraph replaces only the checked paragraph.
5. Apply Paragraph must use conflict detection.
6. Apply Paragraph must not trigger learning extraction or a health-check loop.

##

The is local by default.

It may provide Explain reason, Show result, Give example, Add contrast, Make concession, Summarize point, Insert from Library, and Check this paragraph.

Rules:
1. Do not call the LLM by default.
2. Do not auto-write paragraphs.
3. Do not predict or decide user arguments.
4. Do not generate a full next sentence from context.
5. Insert static templates or Learning Library expressions at the saved cursor position when possible.
6. If cursor insertion is unreliable, insert at the editor end.

## Local Proofreading Signals

Local Proofreading Signals borrow the rule-checking idea from LanguageTool, but they stay local and lightweight.

Rules:
1. Text Stats, punctuation spacing, duplicate words, common typo hints, style hints, and long-sentence hints run in local code.
2. Do not call LanguageTool public API by default.
3. Do not turn proofreading into full essay correction or scoring.
4. Do not auto-apply proofreading output.
5. Show proofreading inside the editor bottom status bar as a collapsed issue-count button by default.
6. Expand Text Stats and detailed signals only after the user clicks the proofreading button.
7. Do not render proofreading as a separate always-open panel below the editor.
8. Personal Dictionary is stored locally in `linguatype.personalDictionary.v1`.
9. Personal Dictionary suppresses user-approved local proofreading hints where applicable.
10. Personal Dictionary is not a standalone navigation feature; expose it as a type/category inside `表达库 Learning Library`.

## Selection Actions

v0.2.2 Selection Actions are intentionally limited to Explain selected and Save to Library.

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

## Data Control

Data Control belongs in the unified low-frequency `设置` page together with API Settings and trigger/disturbance settings.

Supported local actions: Export Learning Library JSON, Export Writing Habits JSON, Clear Learning Library, Clear Writing Habits, Reset API Settings, and View localStorage keys.

Rules:
1. Clear actions require confirmation.
2. Clear Learning Library clears only `linguatype.learningLibrary.v1`.
3. Clear Writing Habits clears only `linguatype.correctionEvents.v1`.
4. Do not delete legacy keys from clear actions.
5. Do not add import, cloud sync, login, database, or payment.

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
- mixed Chinese-English latest sentence
- pure English polishing and unchanged output
- multiple Chinese segments in one sentence
- range replacement with duplicate earlier sentences
- Apply / Cancel / Regenerate / Copy behavior
- background learning extraction only after Apply
- Learning Library deduplication
- Correction Events and Writing Habits aggregation
- trigger modes and cache/throttle behavior
- behavior
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
