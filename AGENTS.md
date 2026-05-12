# AGENTS.md

## Product

This project is LinguaType, an English sentence enhancement and expression input assistant for Chinese-speaking English learners.

LinguaType is not:
- a general translator
- an essay generator
- a full essay correction tool
- a real system-level input method
- a Chrome extension in v0.1

LinguaType is:
- a web-based writing assistant
- an input-method-like latest-sentence enhancer
- a tool for converting mixed Chinese-English sentences into natural English
- a tool for lightly polishing pure English sentences
- a tool for saving reusable phrases, collocations, and sentence patterns

## Core interaction

The app processes only the latest sentence when the user presses Ctrl/Cmd + Enter.

Ctrl/Cmd + J may be kept only as an optional legacy shortcut when the editor is focused, and it must call preventDefault.

Rules:
1. Do not require "/" or any trigger prefix.
2. Do not require selected text.
3. Do not ask the user to choose among Chinese segments.
4. Automatically extract the latest non-empty sentence.
5. If the latest sentence contains Chinese, convert all Chinese segments and polish the sentence.
6. If the latest sentence contains no Chinese, lightly polish the English sentence.
7. Only revise the latest sentence.
8. Use previous context only for tone and coherence reference.
9. Never rewrite the whole paragraph.
10. Never generate new arguments.
11. Never decide the user's writing direction.
12. Never auto-apply model output.
13. Save learning items only after the user clicks Apply.
14. If a pure English sentence is already natural and correct, unchanged output is valid.

## Editor state and conflict handling

Use versioned localStorage keys:
- linguatype.apiSettings.v1
- linguatype.learningHistory.v1
- linguatype.learningLibrary.v1
- linguatype.correctionMemory.v1 legacy
- linguatype.correctionEvents.v1
- linguatype.paragraphHealthCache.v1
- linguatype.writingDraft.v1

Editor draft behavior:
1. Auto-save editor content to localStorage.
2. Restore the saved draft on page load.

Text-change conflict handling:
1. When enhancement starts, store requestId, snapshotFullText, latestSentenceRange, and originalSentence.
2. On Apply, if current editor text differs from snapshotFullText, do not apply automatically.
3. Show a conflict warning and ask the user to run enhancement again.

## Latest sentence extraction and replacement

Latest sentence extraction rules:
1. Trim trailing whitespace for detection, but preserve original fullText for replacement.
2. Extract the latest non-empty sentence.
3. Treat ".", "?", "!", "。", "？", "！", ";", "；", and newline as boundaries.
4. If text ends with punctuation, return the full latest sentence, not an empty string.
5. If the latest sentence has no ending punctuation, process it as an unfinished latest sentence.
6. If the text is empty, show an empty state and do not call the API.
7. Never process earlier sentences except as previousContext.

Replacement rules:
1. replaceLatestSentence must use the extracted start/end range.
2. Never use string replacement because duplicate earlier sentences may exist.
3. Preserve spacing around replacement.

## AI behavior

The model should return structured JSON only.

Legacy `/api/enhance-latest-sentence` may produce the full v0.2 enhancement shape:
- originalSentence
- finalSentence
- taskType
- hasChinese
- insertedExpressions
- hasCorrection
- corrections
- coherenceRisk
- learningItems

v0.2.1 primary `/api/enhance-fast` must produce only:
- originalSentence
- finalSentence
- explanationZh
- taskType
- hasChinese

`/api/enhance-fast` must not return learningItems, corrections, correctionEvents, coherenceRisk, Markdown, HTML, or multiple candidates.

`learningItems` and `correctionEvents` may be generated only by `/api/extract-learning`, and `/api/extract-learning` may run only after the user clicks Apply for the latest sentence suggestion.

For latest-sentence enhancement, the model should not return:
- Markdown
- HTML
- multiple candidate translations
- full paragraphs
- essay-level feedback unless explicitly requested later

The full manual paragraph flow route may return the checked current paragraph as `revisedParagraph`, but it must not rewrite the whole article or auto-apply the result.

Server-side normalization:
1. The server determines hasChinese and taskType from latestSentence using code.
2. The model may return hasChinese and taskType, but the server must normalize or override inconsistent values.
3. Legacy enhancement responses must be normalized into EnhanceLatestSentenceResult.
4. Fast enhancement responses must be normalized into FastEnhanceResult.
5. Learning extraction responses must be normalized into LearningExtractionResult.

Pure-English unchanged output:
1. If a pure English sentence is already natural and correct, the model may return it unchanged.
2. The UI must treat unchanged output as valid.

Robust JSON parsing:
1. Try direct JSON.parse first.
2. If it fails, strip Markdown code fences.
3. Then try to extract the first valid JSON object.
4. If parsing still fails, show a clear invalid JSON error.
5. Raw model response must appear only in a collapsed debug section.
6. Do not apply changes when JSON parsing or schema validation fails.

## Diff

Diff highlighting must be generated by code, not by the LLM.

Use word-level diff:
- removed text: red strikethrough
- added text: green highlight

## Learning history

Learning items are saved to localStorage after Apply.

Deduplicate learning history by type + content.

If the same learning item already exists, increment useCount instead of creating a duplicate.

Each item should include:
- id
- type
- content
- chineseMeaning
- usageNote
- sourceSentence
- writingMode
- createdAt
- useCount

## Next expression toolbox

The toolbox must not predict the user's next sentence.

It should offer neutral writing intentions:
- Explain reason
- Show result
- Give example
- Add contrast
- Make concession
- Summarize point

Suggestions should be expression blocks or sentence starters, not fixed arguments.

History-based suggestions must be conditional, for example:
- "If you want to discuss negative effects, you can use..."
- "If you want to explain a reason, you can use..."

## Tech constraints

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- localStorage
- diff npm package
- zod

Mock Mode:
1. Mock Mode should be available for development, demos, and automated tests.
2. If Mock Mode is enabled, do not require Base URL, API Key, or Model.
3. Mock results should be deterministic.

Do not add in v0.1:
- database
- authentication
- payment
- Chrome extension
- real input method
- cloud sync
- spaced repetition system
- full essay correction
- social features

## Testing

Before considering a task complete, run:
- npm run lint
- npm run build

Acceptance cases must cover:
- mixed Chinese-English latest sentence
- pure English sentence polishing
- multiple Chinese segments in one sentence
- grammar correction
- collocation correction
- empty editor
- missing API settings
- invalid model JSON

## v0.2 Scope

LinguaType v0.2 upgrades the product from a latest-sentence enhancer to a stronger writing expression learning assistant.

v0.2 adds:
- Learning Library upgrade
- Correction Memory
- Manual Paragraph Flow Check
- Intention-based Next Expression Toolbox
- Enhancement Level
- Regenerate
- Copy revised sentence

v0.2 must not change the v0.1 core flow:
latest sentence -> enhancement -> code diff -> Apply/Cancel -> learning save.

## Paragraph Flow Check

Full Paragraph Flow Check is manual only.

Lightweight Paragraph Health Check may run after Apply for the latest sentence when the current paragraph is long enough. It must not return revisedParagraph, generate a diff, save learning data, or auto-apply changes.

The app may check:
- repetition
- transition
- pronoun reference
- logic gap
- sentence order
- tone consistency
- weak development

The app must not:
- auto-rewrite paragraphs
- score essays
- rewrite the whole article
- apply changes without confirmation

## Learning Library

Learning items must support:
- search
- filter
- favorite
- copy
- insert
- delete
- export

Deduplicate by type + content.

For v0.2, Learning Library deduplicates by type + normalized content.
Normalized content must at least trim whitespace and compare case-insensitively.

## Correction Memory

Correction Memory is the v0.2 legacy correction signal model. In v0.2.1, new correction signals should be stored as Correction Events and summarized through Writing Habits.

Legacy Correction Memory deduplicates by before + after + type.

Correction Events deduplicate by normalized before + normalized after + type.

Regenerate, Copy revised sentence, Cancel, Paragraph Flow Check, and Paragraph Health Check must not save correction memory or correction events.

## Next Expression Toolbox

Next Expression Toolbox is the v0.2 legacy name. In v0.2.1, the current high-frequency UI is Inline Expression Menu near the editor.

The expression menu must remain intention-based.

The user chooses a writing intention first.

Suggestions must be expression tools, not fixed arguments.

It must not predict the user's next argument, generate a full next sentence from context, or auto-write.

## Enhancement Level

Supported levels:
- minimal
- balanced
- polished

Do not over-polish when minimal or balanced is selected.

Enhancement Level controls rewrite strength:
- minimal fixes only clear errors and may return unchanged output.
- balanced fixes errors and clearly unnatural expression.
- polished may make the sentence smoother or more formal without changing meaning.

Regenerate must reuse the same original sentence, range, context, writing mode, and enhancement level. It must not create a multi-candidate UI and must not save learning data.

Copy revised sentence copies finalSentence only. It must not modify editor text and must not save learning data.

LinguaType v0.2 still uses localStorage only.

Do not implement in v0.2:
- login
- database
- payment
- Chrome extension
- cloud sync
- spaced repetition
- essay scoring
- full essay correction
- auto-writing
- auto paragraph rewrite
- multi-candidate translation UI
- chat bot interface

## v0.2.1 Scope

LinguaType v0.2.1 refines v0.2 by:
- splitting fast enhancement from learning extraction
- replacing the Common Issues UI with Writing Habits insights
- turning Paragraph Flow Check into a non-intrusive Paragraph Health Check after Apply
- moving the Next Expression Toolbox into an Inline Expression Menu near the editor

v0.2.1 must preserve the core flow:
latest sentence -> fast enhancement -> code diff -> Apply/Cancel.

Fast Enhancement rules:
1. Fast Enhancement must not save learning data.
2. Fast Enhancement returns only the latest sentence suggestion and a short explanation.
3. Regenerate uses Fast Enhancement and must not create a multi-candidate UI.
4. Copy revised sentence copies finalSentence only and must not save learning data.

Learning Extraction rules:
1. Learning Extraction runs only after the user clicks Apply for the latest sentence.
2. Learning Extraction must not block the editor replacement.
3. If Learning Extraction fails, do not roll back the applied text.
4. Learning Library still deduplicates by type + normalized content.

Correction Events and Writing Habits:
1. Correction Events are the data layer.
2. Writing Habits are aggregated insights, not raw logs.
3. Correction Events deduplicate by normalized before + normalized after + type.
4. Legacy linguatype.correctionMemory.v1 may be migrated to linguatype.correctionEvents.v1, but the old key must not be deleted.

Paragraph Health Check:
1. Paragraph Health Check runs only after Apply and only when the paragraph is long enough.
2. Paragraph Health Check must not auto-apply, interrupt writing, score essays, or rewrite the paragraph.
3. Full Paragraph Flow suggestions require explicit user action.
4. Apply Paragraph must not save Learning Library data or Correction Events.

Inline Expression Menu:
1. The Inline Expression Menu must not call the LLM by default.
2. It must not auto-write paragraphs.
3. It must not predict or decide user arguments.
4. It can insert static intention templates and Learning Library expressions at the saved cursor position.
5. Do not restore "/" trigger.

v0.2.1 still uses localStorage only.

Do not implement in v0.2.1:
- login
- database
- payment
- Chrome extension
- cloud sync
- system input method
- full essay correction
- essay scoring
- automatic continuation
- automatic paragraph rewrite
- multi-candidate translation UI
- chatbot interface
- large dashboard

Regression rules that must remain true:
- punctuation-ending latest sentence extraction
- duplicate sentence replacement by range
- pure-English unchanged output
- learning history deduplication
- draft autosave
- mock mode
- JSON mode off by default
- API key redaction
- text-change conflict during generation

## LLM Provider Abstraction

This project must support user-provided LLM APIs through a unified provider interface.

Do not hardcode any single model vendor into product logic.

The product logic should call:

- enhanceFastWithLLM(input, apiConfig) for v0.2.1 latest-sentence suggestions
- extractLearningWithLLM(input, apiConfig) after Apply
- checkParagraphHealthWithLLM(input, apiConfig) for lightweight paragraph health
- checkParagraphFlowWithLLM(input, apiConfig) for full manual paragraph suggestions
- enhanceLatestSentenceWithLLM(input, apiConfig) only for legacy compatibility

The provider layer should adapt different APIs and always return the same internal result shape for each flow.

Primary provider for v0.1:

- OpenAI-compatible Chat Completions

The user can configure:

- provider
- baseUrl
- endpointPath
- apiKey
- model
- temperature
- maxTokens
- supportsJsonMode
- mockMode

Rules:

1. Never hardcode API keys.
2. Never commit API keys.
3. Never log API keys.
4. Redact API keys from displayed errors and internal error objects.
5. Store API settings in localStorage for v0.1.
6. Use linguatype.apiSettings.v1 as the API settings localStorage key.
7. Use linguatype.learningHistory.v1 as the learning history localStorage key.
8. Use linguatype.writingDraft.v1 as the editor draft localStorage key.
9. Send API config to the Next.js API route per request.
10. Do not persist API keys on the server.
11. Business logic must not call vendor APIs directly.
12. All model responses must be normalized into the correct internal result shape.
13. Validate model responses with zod.
14. supportsJsonMode defaults to false.
15. Users may enable JSON mode manually in advanced settings.
16. If a provider does not support JSON mode, rely on prompt-based JSON output and robust JSON parsing.
17. If a provider returns invalid JSON, show a clear error and do not apply changes.
18. Keep provider-specific code under src/lib/llm/providers/.
19. Keep prompts under src/lib/llm/prompts.ts.
20. Keep shared types under src/lib/llm/types.ts.

/api/test-connection rules:
1. Use a minimal prompt asking the provider to return {"ok": true}.
2. Do not use the full enhancement prompt for connection testing.

Do not build separate product flows for each model vendor.
Only build adapters.
