---
name: product-scope
description: Use when defining, reviewing, or changing LinguaType product scope, MVP boundaries, user flows, feature prioritization, or avoiding scope creep.
---

# Product Scope Skill

LinguaType is a latest-sentence enhancement assistant for Chinese-speaking English learners.

The app processes only the latest sentence when the user presses Ctrl/Cmd + J.

Core product rules:
1. No "/" trigger.
2. No text selection requirement.
3. No Chinese segment chooser.
4. No multiple translation candidates.
5. No full paragraph rewrite.
6. No essay generation.
7. No argument direction prediction.
8. No database, auth, payment, or Chrome extension in v0.1.
9. Main flow is latest-sentence enhancement.
10. Learning items are saved after user applies the result.

Core flow:
User writes naturally → presses shortcut → app extracts latest sentence → AI revises only latest sentence → code diff highlights changes → user applies or cancels → learning items are saved.

Reject or postpone features that make the MVP become:
- a translation app
- an essay generator
- a full writing correction platform
- a social learning product
- a real input method