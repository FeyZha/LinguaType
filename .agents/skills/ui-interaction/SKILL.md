---
name: ui-interaction
description: Use when building or modifying LinguaType UI, editor behavior, shortcut behavior, diff viewer, panels, or interaction states.
---

# UI Interaction Skill

LinguaType should feel like a lightweight writing assistant, not a chat app.

Main interaction:
1. User writes in a large editor.
2. User presses Ctrl/Cmd + J or clicks "Enhance latest sentence".
3. Show loading state.
4. Show popover with final sentence, diff, and corrections.
5. User can Apply or Cancel.
6. After Apply, replace only the latest sentence and save learning items.

UI structure:
- Top bar: product name, writing mode selector, shortcut hint, API settings.
- Main area: writing editor.
- Right panel: correction explanations, learning history, next expression toolbox.

Diff:
- Use code-based word-level diff.
- Removed text: red strikethrough.
- Added text: green highlight.
- Do not use LLM-generated HTML.

Interaction rules:
- Do not auto-apply.
- Do not interrupt writing with large modal unless API settings are missing.
- Keep the editor as the center of the experience.
- Keep suggestions optional.
- Do not show multiple translation candidates.