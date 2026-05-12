---
name: ui-interaction
description: Use when building or modifying LinguaType UI, editor behavior, shortcut behavior, diff viewer, panels, or interaction states.
---

# UI Interaction Skill

LinguaType should feel like a lightweight input-method-like writing assistant, not a chat app or dashboard.

## Main Interaction

1. User writes in the large central editor.
2. User presses `Ctrl/Cmd + Enter` or clicks `增强最新一句`.
3. Show the Current Sentence popover immediately with the original sentence and a checking state.
4. When `/api/enhance-fast` returns, show code-generated diff and explanation.
5. User can `应用 Apply`, `取消 Cancel`, `重新生成 Regenerate`, or `复制 Copy`.
6. Apply replaces only the captured latest sentence range, then runs background learning extraction.

`Ctrl/Cmd + J` is legacy and works only when selected in Trigger Settings and the editor is focused.

## UI Structure

- Header: product name and `API Settings 设置`.
- Editor area: WritingEditor, Current Sentence popover, Inline Expression Menu, Selection Actions, Paragraph Health badge.
- Right sidebar: low-frequency Review status, Learning Library, Writing Habits, Tools / Settings, Data Control.

High-frequency writing actions must stay near the editor, not only in the right sidebar.

## Language

User-facing text is Chinese-first for Chinese-speaking English learners. Keep capability names in English or bilingual when useful:
- `当前句建议 Current Sentence`
- `表达库 Learning Library`
- `写作习惯 Writing Habits`
- `表达菜单 Inline Expression Menu`
- `段落健康 Paragraph Health`
- `API Settings 设置`
- `Mock Mode 演示模式`

Operation guidance, buttons, settings, empty states, and status messages should be understandable in Chinese without requiring English UI confidence.

## Diff

- Use code-based word-level diff.
- Removed text: muted gray strikethrough.
- Added text: green highlight.
- Do not use LLM-generated HTML or model-provided diff markup.

## Interaction Rules

1. Do not auto-apply model output.
2. Do not interrupt writing with large panels.
3. Keep suggestions optional and reversible.
4. Do not show multiple translation candidates.
5. Escape closes popovers when enabled.
6. Close / Cancel / Copy / Regenerate do not save learning data.
