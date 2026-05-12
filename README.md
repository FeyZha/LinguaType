# LinguaType

LinguaType is a lightweight web writing assistant for Chinese-speaking English learners. It keeps the v0.1 core flow: enhance only the latest non-empty sentence, show a code-generated diff, and wait for the user to Apply or Cancel before changing the editor or saving learning data.

v0.2 upgrades LinguaType from a latest-sentence enhancer into an expression learning assistant.

v0.2.1 refines that experience into a more input-method-like writing flow: sentence revision returns quickly, learning extraction happens after Apply in the background, writing habits are summarized instead of shown as raw logs, paragraph health is non-intrusive, and expression tools live near the editor.

v0.2.2 moves the most frequent interactions closer to the text: current sentence suggestions appear beside the editor, trigger behavior is configurable, selected text can be explained or saved, and local data controls live in the low-frequency settings area.

LinguaType still is not a translator, chatbot, essay generator, full essay corrector, Chrome extension, or system input method.

## Getting Started

```bash
npm install
npm run dev
```

Common checks:

```bash
npm test
npm run lint
npm run build
```

## Core Flow

1. Write naturally in the central editor.
2. Press `Ctrl/Cmd + Enter`, or click `增强最新一句`.
3. LinguaType extracts only the latest non-empty sentence.
4. If the sentence contains Chinese, it converts all Chinese segments and polishes the sentence.
5. If the sentence is pure English, it lightly polishes it. Unchanged output is valid.
6. Review the code-generated word diff in the `当前句建议 Current Sentence` popover.
7. Click `应用 Apply` to replace only that latest sentence, or `取消 Cancel` to change nothing.
8. Learning data is saved only after Apply.

`Ctrl/Cmd + J` remains a legacy shortcut only when the editor is focused.

## v0.2 Features

### Learning Library

The Library tab turns applied `learningItems` into reusable expression assets. It supports search, type filter, writing-mode filter, favorite-only view, sorting by use count or updated time, copy, insert, delete, and JSON export.

The new key is `linguatype.learningLibrary.v1`. On first load, LinguaType migrates old `linguatype.learningHistory.v1` data into the new library without deleting the old key. Items deduplicate by `type + normalized content`.

### Common Issues

Common Issues is the v0.2 legacy name for raw correction memory. In v0.2.1 the current UI is Writing Habits, which aggregates correction events into habit insights instead of showing a raw `before -> after` log.

The legacy key `linguatype.correctionMemory.v1` may still be migrated, but new v0.2.1 learning signals are stored as `correctionEvents` in `linguatype.correctionEvents.v1`.

Regenerate, Copy revised sentence, Cancel, Paragraph Flow Check, and Paragraph Health Check do not write learning data.

### Paragraph Flow Check

Manual paragraph flow checking is a secondary action inside the Inline Expression Menu as `检查当前段落`. It checks the current paragraph, or the latest non-empty paragraph if cursor position is unavailable.

It can flag repetition, transitions, pronoun reference, logic gaps, sentence order, tone consistency, and weak development. It does not score essays, rewrite the whole article, add new arguments, or auto-apply changes. Apply paragraph replaces only the checked paragraph and uses conflict detection.

### Next Expression Toolbox

Next Expression Toolbox is the v0.2 legacy name. In v0.2.1, the current high-frequency UI is the Inline Expression Menu near the editor.

The expression tool remains intention-based. Choose one intention first:

- Explain reason
- Show result
- Give example
- Add contrast
- Make concession
- Summarize point

It uses static templates and local Learning Library recall by default. It is not auto-writing, does not predict the user's viewpoint, and does not generate a full paragraph or fixed argument.

### UI Language

The interface is Chinese-first for Chinese-speaking English learners. Operation guidance, buttons, settings, empty states, and status messages use Chinese to lower the learning barrier. Product capability names and technical terms remain English or bilingual, such as `Learning Library`, `Writing Habits`, `Inline Expression Menu`, `Current Sentence`, `Paragraph Health`, `API Settings`, and `Mock Mode`.

### Enhancement Level

The top bar includes an Enhancement Level selector:

- `minimal`: fix only clear errors; unchanged pure English is valid.
- `balanced`: default; fix errors and clearly unnatural expressions.
- `polished`: make the sentence smoother or more formal without changing meaning.

### Regenerate

Regenerate re-runs enhancement for the same original latest sentence, range, context, writing mode, and enhancement level. It still shows one result, not multiple candidates, and saves no learning data until Apply.

### Copy Revised Sentence

Copy revised sentence copies `finalSentence` only. It does not update the editor and does not save Learning Library, correction events, or Writing Habits data.

## v0.2.1 Refinements

### Fast Enhancement

`Ctrl/Cmd + Enter`, the enhance button, and Regenerate now use `/api/enhance-fast`. This API returns only the revised latest sentence and a short explanation, so the user can see the diff sooner.

Fast Enhancement does not save Learning Library data or correction events. It only prepares a suggestion for Apply or Cancel.

### Background Learning Extraction

After the user clicks Apply, LinguaType immediately replaces only the latest sentence. Then it calls `/api/extract-learning` in the background to extract:

- `learningItems` for the Learning Library
- `correctionEvents` for long-term writing habit analysis

If extraction fails, the applied editor text is kept. Regenerate, Copy revised sentence, Cancel, and Apply Paragraph do not trigger learning extraction.

### Writing Habits

Common Issues has been upgraded into Writing Habits. The data layer is now `CorrectionEvent`, stored in `linguatype.correctionEvents.v1`.

Writing Habits aggregates correction events by type and shows broader patterns such as collocation issues, word order issues, article issues, or Chinese transfer issues. It does not default to a long raw `before -> after` log, and it is separate from the Learning Library.

The legacy `linguatype.correctionMemory.v1` key is still supported and migrated without deletion.

### Paragraph Health Check

After Apply on the latest sentence, LinguaType may run a lightweight `/api/check-paragraph-health` check in the background if the current paragraph is long enough and has changed meaningfully.

Paragraph Health Check:

- does not block writing
- does not return a revised paragraph
- does not generate a diff
- does not save learning data
- does not auto-apply anything

If it finds likely flow issues, the editor area shows a small `段落健康 Paragraph Health` badge. Full paragraph suggestions are loaded only after the user clicks `查看建议`, which calls the existing `/api/check-paragraph-flow`.

### Inline Expression Menu

Press `Ctrl/Cmd + K` in the editor to open the Inline Expression Menu. It provides:

- intention-based templates
- Insert from Library
- Check this paragraph

The menu is local by default. It does not call the LLM, does not auto-write, does not generate a full paragraph, and does not decide the user's argument direction. Plain `/` and `Alt + /` triggers are not active in v0.2.2.

## v0.2.2 Refinements

### Current Sentence Popover

Fast Enhancement suggestions now appear near the editor instead of making the right Review tab the primary work area. The popover shows the original sentence, suggested sentence, code-generated diff, short explanation, Apply, Cancel, Regenerate, and Copy.

Escape closes the popover when enabled. Apply can auto-close it, and Cancel or Close never saves learning data.

### Trigger and Intrusion Settings

The `工具与设置` tab stores local trigger preferences in `linguatype.triggerSettings.v1`.

Defaults:

- sentence enhancement: `Ctrl/Cmd + Enter`
- inline expression menu: `Ctrl/Cmd + K`
- paragraph health: after every eligible Apply
- writing habits feedback: badge
- status feedback: popover footer

`Ctrl/Cmd + J` works only when the user chooses the legacy shortcut mode and the editor is focused. `button_only` disables sentence enhancement shortcuts but keeps the button. The `/` and `Alt + /` triggers are not restored.

### Selection Actions

When English text is selected in the editor, LinguaType shows a lightweight selection popover with:

- `解释选中内容`
- `保存到 Learning Library`

Explain selected calls `/api/explain-selection` and explains only the selected text. It does not rewrite or replace text. Save to Library is an explicit user action and writes only to the local Learning Library.

### Paragraph Health Modes

Paragraph Health Check remains lightweight and non-blocking, but its trigger can now be set to:

- after every eligible Apply
- after 3 applied latest-sentence edits
- manual only
- off

It still does not return a revised paragraph, generate a diff, save learning data, or auto-apply. Full paragraph flow suggestions are loaded only after the user clicks View suggestions or manually checks a paragraph.

### Data Control

The `数据管理 Data Control` tab provides local-only management:

- Export Learning Library JSON
- Export Writing Habits JSON
- Clear Learning Library
- Clear Writing Habits
- Reset API Settings
- View localStorage keys

Clear actions require confirmation. Clearing the Learning Library does not delete legacy learning history. Clearing Writing Habits does not delete legacy Correction Memory.

## API Settings

Mock Mode is enabled by default for development, demos, and tests. In Mock Mode, Base URL, API Key, and Model are not required.

For real providers, LinguaType uses an OpenAI-compatible Chat Completions adapter. API settings are sent to the Next.js API route per request and are not persisted on the server. JSON mode defaults to off because many compatible providers do not support `response_format`.

The test-connection API uses only a minimal prompt asking the provider to return `{"ok": true}`.

## localStorage Keys

- `linguatype.apiSettings.v1`
- `linguatype.writingDraft.v1`
- `linguatype.learningHistory.v1` legacy
- `linguatype.learningLibrary.v1`
- `linguatype.correctionMemory.v1` legacy
- `linguatype.correctionEvents.v1`
- `linguatype.paragraphHealthCache.v1`
- `linguatype.triggerSettings.v1`

## v0.2 Limits

LinguaType v0.2 / v0.2.1 / v0.2.2 still does not implement:

- login
- database
- payment
- Chrome extension
- system input method
- cloud sync
- spaced repetition
- social features
- full essay correction
- essay scoring
- auto-writing
- automatic paragraph rewrite
- multi-candidate translation UI
- chatbot interface
- streaming JSON as the core implementation
