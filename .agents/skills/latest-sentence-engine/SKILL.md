---
name: latest-sentence-engine
description: Use when implementing latest sentence extraction, Chinese detection, enhancement API, LLM prompt, schema validation, or replacement logic.
---

# Latest Sentence Engine Skill

LinguaType v0.2.2 processes only the latest non-empty sentence for the main enhancement flow.

## Extraction And Replacement

1. Trim trailing whitespace for sentence detection.
2. Treat `.`, `?`, `!`, Chinese sentence punctuation, semicolon, and newline as sentence boundaries.
3. If the latest sentence has no ending punctuation, process it anyway.
4. If the editor is empty, do not call the API.
5. Capture `snapshotFullText`, `latestSentenceRange`, and `originalSentence` at trigger time.
6. On Apply, reject replacement if the current editor text differs from `snapshotFullText`.
7. Replace only the captured range. Never use global string replacement.

## Chinese Handling

1. Detect Chinese in code with `containsChinese`; do not rely on the model to decide.
2. If the latest sentence contains Chinese, convert all Chinese segments in one API call and polish the sentence.
3. If there are multiple Chinese segments, convert all of them.
4. Do not ask the user to choose a Chinese segment.
5. Normalize the final task type to `mixed_chinese_rewrite`.

## Pure English Handling

1. If the latest sentence has no Chinese, lightly polish it.
2. Unchanged output is valid when the sentence is already natural.
3. Fix grammar, word order, tense, articles, and collocations only when needed.
4. Do not over-polish or change meaning.
5. Normalize the final task type to `english_polish` or `unchanged`.

## Fast Enhancement API

The main route is `POST /api/enhance-fast`.

The model prompt should request only:
- `finalSentence`
- `explanationZh`

The server owns and normalizes:
- `originalSentence`
- `hasChinese`
- `taskType`

The final API response may contain only:
- `originalSentence`
- `finalSentence`
- `explanationZh`
- `taskType`
- `hasChinese`

Do not return learning items, correction events, paragraph advice, Markdown, HTML, or multiple candidates from `/api/enhance-fast`.

## JSON Robustness

Use robust JSON parsing and zod validation for model outputs. The parser should tolerate common model wrapping such as Markdown code fences and recoverable unescaped quotes, but schema validation must still reject wrong shapes.
