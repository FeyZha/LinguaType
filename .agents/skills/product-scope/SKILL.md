---
name: product-scope
description: Use when defining, reviewing, or changing LinguaType product scope, MVP boundaries, user flows, feature prioritization, or avoiding scope creep.
---

# Product Scope Skill

LinguaType v0.2.2 is a web-based, input-method-like English expression assistant for Chinese-speaking English learners.

## Product Definition

LinguaType is:
- a latest-sentence enhancer
- a mixed Chinese-English sentence converter
- a light pure-English polishing tool
- a local expression learning assistant
- a local Learning Library and Writing Habits tool

LinguaType is not:
- a general translator
- a chatbot
- an essay generator
- a full essay correction or scoring tool
- a Chrome extension
- a real system-level input method
- a cloud-sync product

## Core Flow

User writes naturally -> triggers latest sentence enhancement -> app extracts only the latest non-empty sentence -> `/api/enhance-fast` revises only that sentence -> code-generated diff appears near the editor -> user applies or cancels -> background learning extraction runs only after Apply.

## Scope Rules

1. Default enhancement trigger is `Ctrl/Cmd + Enter`.
2. `Ctrl/Cmd + J` is legacy and editor-focused only when configured.
3. No `/` trigger.
4. No selected-text requirement for latest-sentence enhancement.
5. No Chinese segment chooser.
6. No multiple translation candidates.
7. No full paragraph rewrite through latest-sentence enhancement.
8. No essay generation, essay scoring, or argument direction prediction.
9. No login, database, payment, cloud sync, Chrome extension, or real input method.
10. Learning items and correction events are saved only after explicit user acceptance.

Selection Actions are auxiliary and limited to explaining selected text or explicitly saving selected text to Learning Library. They must not become the main enhancement path.
