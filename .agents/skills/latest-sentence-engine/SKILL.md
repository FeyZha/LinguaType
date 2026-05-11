---
name: latest-sentence-engine
description: Use when implementing latest sentence extraction, Chinese detection, enhancement API, LLM prompt, schema validation, or replacement logic.
---

# Latest Sentence Engine Skill

The engine processes only the latest non-empty sentence.

Latest sentence extraction:
1. Trim trailing whitespace for detection.
2. Treat ".", "?", "!", "。", "？", "！", ";", "；", and newline as boundaries.
3. If the latest sentence has no ending punctuation, process it anyway.
4. If the editor is empty, do not call the API.
5. Preserve original fullText when replacing.

Chinese handling:
1. If latest sentence contains Chinese, taskType is mixed_sentence_enhancement.
2. Convert all Chinese segments in the latest sentence.
3. If there are multiple Chinese segments, convert all in one API call.
4. Do not ask the user to choose a Chinese segment.

Pure English handling:
1. If latest sentence has no Chinese, taskType is english_sentence_polishing.
2. Lightly polish only the latest sentence.
3. Fix grammar, word order, tense, articles, and collocations.
4. Do not over-polish or change meaning.

API response must contain:
- taskType
- originalSentence
- finalSentence
- hasChinese
- insertedExpressions
- hasCorrection
- corrections
- coherenceRisk
- learningItems

Use zod to validate the response.
Use robust JSON parsing.
Do not let the LLM return HTML or Markdown.