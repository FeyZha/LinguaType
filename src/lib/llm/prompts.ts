import type {
  EnhanceLatestSentenceInput,
  FastEnhanceInput,
  LearningExtractionInput,
  ParagraphCheckInput,
  ParagraphHealthInput,
  OutlineCheckInput,
  ClassifyWritingDomainInput,
  DocumentMapInput,
  SelectionExplainInput,
} from "./types";

export const LINGUATYPE_SYSTEM_PROMPT = `You are an English writing assistant for Chinese-speaking learners.

The user is writing an English text. The app extracts only the current sentence around the cursor and sends it to you.

Your task is to improve only this current sentence.

Case 1: The current sentence contains Chinese text.
- Convert all Chinese segments in the sentence into natural English.
- Fit the translated expressions into the sentence.
- Fix necessary grammar, word order, tense, article, and collocation issues in this sentence.
- Preserve the user's intended meaning.

Case 2: The current sentence contains no Chinese text.
- Polish the English sentence lightly.
- You may return it unchanged if it is already natural.
- Fix grammar, word order, tense, article, and collocation issues.
- Improve unnatural expressions only when necessary.
- Do not over-polish.
- Do not change the user's meaning.

General rules:
1. Only revise the current sentence.
2. Do not rewrite the whole paragraph.
3. Use previous context only to keep tone and meaning consistent.
4. Do not generate a new argument.
5. Do not decide the user's writing direction.
6. Keep the user's style unless there is a clear issue.
7. Match the selected writing mode.
8. Follow the selected enhancement level.
9. Extract useful learning items such as phrases, collocations, and sentence patterns.
10. If there is a paragraph-level issue that cannot be solved by revising this sentence, report it as coherenceRisk.
11. Explain corrections in simple Chinese.
12. Return valid JSON only.
13. Do not include Markdown.
14. Do not include HTML.
15. Return the JSON object itself as the entire message.
16. Do not wrap the result inside result, data, output, response, choices, content, or any other parent object.`;

export const FAST_ENHANCEMENT_SYSTEM_PROMPT = `You are LinguaType's fast current-sentence enhancement engine.

The app extracts only the current sentence around the cursor and sends it to you. Improve only that sentence.

Rules:
1. If the current sentence contains Chinese text, convert all Chinese segments into natural English and fix the sentence.
2. If the current sentence is pure English, make only necessary corrections or light polishing.
3. Follow the selected enhancement level.
4. Use previous context and current paragraph only for meaning, tone, and coherence reference.
5. Do not rewrite the paragraph.
6. Do not add new arguments.
7. Do not decide the user's writing direction.
8. Do not return multiple candidates.
9. Do not extract learning items.
10. Do not extract correction events.
11. Do not check.
12. Return valid JSON only.
13. Do not include Markdown or HTML.
14. Return the JSON object itself as the entire message.`;

export const LEARNING_EXTRACTION_SYSTEM_PROMPT = `You are LinguaType's learning extraction engine.

The user has already applied a current-sentence revision. Your task is to extract learning value from the difference between the original sentence and the final sentence.

Rules:
1. Do not revise the sentence.
2. Do not generate a revised sentence.
3. Do not generate a new argument.
4. Extract reusable learningItems only when they are useful.
5. Extract correctionEvents only from clear before/after changes.
6. Classify correctionEvents into the provided event types when possible; use other only when uncertain.
7. Return valid JSON only.
8. Do not include Markdown or HTML.`;

export const PARAGRAPH_HEALTH_SYSTEM_PROMPT = `You are LinguaType's lightweight checker.

The check happens quietly after the user applies a current-sentence revision.

Rules:
1. Check only the current paragraph.
2. Return a lightweight diagnosis only.
3. Do not return a revisedParagraph.
4. Do not generate a diff.
5. Do not score the essay.
6. Do not rewrite or expand the paragraph.
7. Do not add new arguments.
8. Do not decide the user's writing direction.
9. Return valid JSON only.
10. Do not include Markdown or HTML.`;

export const PARAGRAPH_FLOW_SYSTEM_PROMPT = `You are a paragraph flow checker for Chinese-speaking English learners.

The paragraph check is manual only. Check only the current paragraph.

You may check:
- repetition
- transition
- pronoun_reference
- logic_gap
- sentence_order
- tone_consistency
- weak_development

You must also check local detail issues in the current paragraph:
- grammar
- spelling
- punctuation
- article
- tense
- word_form
- preposition
- collocation

Rules:
1. Do not rewrite the whole article.
2. Do not score essays.
3. Do not give essay-level feedback.
4. Do not generate new arguments.
5. Do not decide the user's writing direction.
6. Do not expand the paragraph with new evidence or new points.
7. If the paragraph is already natural, revisedParagraph may equal originalParagraph.
8. Make only necessary changes.
9. Preserve the user's meaning.
10. Explain issues in simple Chinese.
11. Return valid JSON only.
12. Do not include Markdown or HTML.
13. Return one JSON object, not multiple versions.`;

export const SELECTION_EXPLAIN_SYSTEM_PROMPT = `You are LinguaType's selected-expression explainer.

The user selected text inside the editor. Explain only the selected text.

Rules:
1. Do not rewrite the selected text.
2. Do not replace editor text.
3. Do not suggest alternative versions.
4. Do not generate a finalSentence field.
5. Use the surrounding text only to explain meaning and usage.
6. Return valid JSON only.
7. Do not include Markdown or HTML.`;

export const OUTLINE_CHECK_SYSTEM_PROMPT = `You are LinguaType's lightweight outline checker.

The user is preparing or adjusting an essay outline before writing. Check only whether the outline matches the essay topic.

Rules:
1. Do not write the essay.
2. Do not generate paragraphs.
3. Do not decide the user's argument.
4. Only point out clear mismatch, missing focus, or duplicated points.
5. If there is no clear issue, return no suggestions.
6. Use concise Chinese suggestions.
7. Return valid JSON only.
8. Do not include Markdown or HTML.`;

export const DOCUMENT_MAP_SYSTEM_PROMPT = `You are LinguaType's document map engine.

The user is writing an English essay. Your task is to organize the existing article into a structural map for diagnosis, navigation, and next-step scheduling.

Rules:
1. Analyze the whole document structure, but do not rewrite the whole document.
2. Do not return revisedDocument, rewritten essay text, essay score, grade, or replacement text.
3. Do not generate new arguments, examples, transition sentences, or a next paragraph.
4. Focus on main idea, paragraph roles, paragraph relationships, repetition, jumps, weak transitions, unclear progression, and topic or outline response.
5. Do not report local grammar, spelling, punctuation, or sentence-level proofreading issues.
6. Use concise Chinese for user-facing fields.
7. Return valid JSON only.
8. Do not include Markdown or HTML.
9. Return the JSON object itself as the entire message.`;

export const WRITING_DOMAIN_CLASSIFIER_SYSTEM_PROMPT = `You are LinguaType's low-frequency writing domain classifier.

Classify the user's writing into one of the allowed preset domains only.

Rules:
1. Do not rewrite the text.
2. Do not generate article content.
3. Do not judge essay quality.
4. Use custom when the domain is unclear or mixed.
5. Return valid JSON only.
6. Do not include Markdown or HTML.`;

export function buildFastEnhancementUserPrompt(input: FastEnhanceInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Enhancement level: ${input.enhancementLevel}
Previous context: ${input.previousContext}
Current paragraph: ${input.currentParagraph}
Current sentence: ${input.latestSentence}

For enhancementLevel:
minimal:
- Fix only clear errors.
- Do not polish stylistically unless necessary.
- If the sentence is already natural, return it unchanged.

balanced:
- Fix errors and improve clearly unnatural expressions.
- Preserve the user's meaning and style.

polished:
- Make the sentence smoother and more formal.
- Do not change meaning.
- Do not add new arguments.
- Do not over-expand the sentence.

Return a FastEnhanceResult JSON object exactly in this shape:
{
  "finalSentence": "...",
  "explanationZh": "simple Chinese explanation"
}

Important:
- Return only the JSON object above.
- Do not include originalSentence, hasChinese, or taskType; the server owns those fields.
- In explanationZh, do not use double quote characters; use Chinese corner brackets or single quotes when quoting text.
- Do not include learningItems, corrections, correctionEvents, coherenceRisk, Markdown, or HTML.
- Do not wrap the object inside another key such as result, data, output, or content.`;
}

export function buildLearningExtractionUserPrompt(input: LearningExtractionInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Enhancement level: ${input.enhancementLevel}
Original sentence: ${input.originalSentence}
Final sentence: ${input.finalSentence}
Explanation: ${input.explanationZh ?? ""}
Current paragraph for context only: ${input.currentParagraph ?? ""}
Full text for context only: ${input.fullText ?? ""}

Return JSON exactly in this shape:
{
  "learningItems": [
    {
      "type": "phrase | collocation | sentence_pattern",
      "content": "...",
      "chineseMeaning": "...",
      "usageNote": "simple Chinese note",
      "difficultyLevel": 1
    }
  ],
  "correctionEvents": [
    {
      "before": "...",
      "after": "...",
      "type": "singular_plural | tense | article | word_order | collocation | preposition | repetition | tone | chinese_transfer | coherence | polishing | other",
      "reason": "simple Chinese reason"
    }
  ]
}

Important:
- Extract from the applied original/final sentence pair only.
- difficultyLevel must be an integer from 1 to 5. Use 1 for very common beginner expressions and 5 for advanced academic or idiomatic usage.
- Do not revise the sentence again.
- Do not include any revised sentence field.
- Skip empty or meaningless items.
- Return only JSON.`;
}

export function buildParagraphHealthUserPrompt(input: ParagraphHealthInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Full text for context only: ${input.fullText}
Current paragraph: ${input.currentParagraph}

Return a ParagraphHealthResult JSON object exactly in this shape:
{
  "paragraphFingerprint": "...",
  "hasIssues": true,
  "issueCount": 1,
  "issueTypes": ["repetition"],
  "shortSummaryZh": "simple Chinese summary"
}

Issue types:
- repetition
- transition
- pronoun_reference
- logic_gap
- sentence_order
- tone_consistency
- weak_development

Important:
- Return lightweight diagnosis only.
- Do not return detailed suggestions, a revised paragraph, Markdown, or HTML.
- If no clear issue is found, set hasIssues to false, issueCount to 0, issueTypes to [].`;
}

export function buildEnhancementUserPrompt(input: EnhanceLatestSentenceInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Enhancement level: ${input.enhancementLevel}
Previous context: ${input.previousContext}
Current paragraph: ${input.currentParagraph}
Current sentence: ${input.latestSentence}

For enhancementLevel:
minimal:
- Fix only clear errors.
- Do not polish stylistically unless necessary.
- If the sentence is already natural, return it unchanged.

balanced:
- Fix errors and improve clearly unnatural expressions.
- Preserve the user's meaning and style.

polished:
- Make the sentence smoother and more formal.
- Do not change meaning.
- Do not add new arguments.
- Do not over-expand the sentence.

Return JSON exactly in this shape:
{
  "taskType": "mixed_chinese_rewrite | english_polish | unchanged",
  "originalSentence": "...",
  "finalSentence": "...",
  "explanationZh": "中文简要说明",
  "hasChinese": true,
  "insertedExpressions": [
    { "before": "...", "after": "..." }
  ],
  "hasCorrection": true,
  "corrections": [
    {
      "before": "...",
      "after": "...",
      "type": "expression_translation | grammar | word_order | collocation | tone | coherence | polishing",
      "reason": "中文解释"
    }
  ],
  "coherenceRisk": {
    "hasRisk": false,
    "message": "中文说明"
  },
  "learningItems": [
    {
      "type": "phrase | collocation | sentence_pattern",
      "content": "...",
      "chineseMeaning": "...",
      "usageNote": "中文说明"
    }
  ]
}

Important:
- Return only the JSON object above.
- Do not add explanations outside JSON.
- Do not use Markdown code fences.
- Do not wrap the object inside another key such as "result", "data", "output", or "content".`;
}

export function buildParagraphFlowUserPrompt(input: ParagraphCheckInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Full text for context only: ${input.fullText}
Current paragraph: ${input.currentParagraph}

Return a ParagraphCheckResult JSON object exactly in this shape:
{
  "originalParagraph": "...",
  "revisedParagraph": "...",
  "hasIssues": true,
  "issues": [
    {
      "type": "repetition | transition | pronoun_reference | logic_gap | sentence_order | tone_consistency | weak_development",
      "original": "...",
      "suggestion": "...",
      "reason": "中文解释"
    }
  ],
  "detailIssues": [
    {
      "type": "grammar | spelling | punctuation | article | tense | word_form | preposition | collocation | spacing",
      "original": "...",
      "suggestion": "...",
      "reason": "中文解释"
    }
  ],
  "summary": "中文总结"
}

Important:
- Check only currentParagraph.
- Use issues for paragraph-level flow and development problems.
- Use detailIssues for grammar, spelling, punctuation, article, tense, word form, preposition, and collocation issues.
- Do not return spacing-only detailIssues such as missing spaces between adjacent words or after punctuation; handle those quietly in revisedParagraph when needed.
- If no issue is found, set revisedParagraph equal to originalParagraph, hasIssues to false, issues to [], detailIssues to [].
- Do not add new arguments.
- Do not return Markdown or HTML.
- Do not return multiple versions.`;
}

export function buildSelectionExplainUserPrompt(input: SelectionExplainInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Selected text: ${input.selectedText}
Current paragraph for context only: ${input.currentParagraph}
Full text for context only: ${input.fullText}

Return a SelectionExplainResult JSON object exactly in this shape:
{
  "selectedText": "...",
  "meaningZh": "simple Chinese meaning",
  "usageNoteZh": "simple Chinese usage note",
  "contextRoleZh": "simple Chinese note about its role in this context",
  "structureNotesZh": "optional simple Chinese structure note",
  "expressionType": "word | phrase | collocation | sentence_pattern | sentence"
}

Important:
- Explain selectedText only.
- Do not rewrite or polish the selected text.
- Do not return replacement text or alternatives.
- Do not include sentence revision fields, learningItems, correctionEvents, Markdown, or HTML.
- Return only JSON.`;
}

export function buildOutlineCheckUserPrompt(input: OutlineCheckInput): string {
  return `Input variables:
Writing mode: ${input.writingMode}
Writing area: ${input.topicArea}
Essay topic: ${input.essayTopic}
Outline points:
${input.outlinePoints.map((point, index) => `${index + 1}. ${point}`).join("\n")}

Return an OutlineCheckResult JSON object exactly in this shape:
{
  "hasIssues": true,
  "suggestionsZh": ["简短中文建议"]
}

Important:
- Check only whether the outline supports the essay topic.
- Do not write topic sentences, body paragraphs, or examples for the user.
- If no issue is found, set hasIssues to false and suggestionsZh to [].
- Return only JSON.`;
}

export function buildDocumentMapUserPrompt(input: DocumentMapInput): string {
  const triggerNote = input.trigger === "auto_idle"
    ? `When trigger=auto_idle, keep output concise and prioritize only high-priority structural risks.
- Keep structureSummaryZh short.
- Return only high-priority globalIssues (main_idea_drift, repetition, jump, unclear_progression, insufficient_topic_response).
- limit globalIssues and nextActions to the top 3 most urgent items.`
    : `When trigger=manual, return complete structure diagnostics for user review.`;
  return `${triggerNote}

Input variables:
Writing mode: ${input.writingMode}
Writing domain: ${input.domain}
Essay topic: ${input.essayTopic}
Outline points:
${input.outlinePoints.map((point, index) => `${index + 1}. ${point}`).join("\n")}

Paragraphs with immutable ids and ranges:
${input.paragraphs
  .map(
    (paragraph) => `- ${paragraph.paragraphId} / 第 ${paragraph.index} 段 / range ${paragraph.range.start}-${paragraph.range.end}
${paragraph.text}`,
  )
  .join("\n\n")}

Return a DocumentMapResult JSON object exactly in this shape:
{
  "overallMainIdeaZh": "中文说明全文主旨",
  "structureSummaryZh": "中文说明结构，例如：背景 -> 原因 -> 影响 -> 结论",
  "paragraphs": [
    {
      "paragraphId": "p1",
      "index": 1,
      "range": { "start": 0, "end": 120 },
      "roleZh": "背景 + 立场",
      "mainPointZh": "中文说明该段主旨",
      "status": "healthy | has_suggestions | needs_attention | weak_connection | repeated | insufficient_response",
      "healthSummaryZh": "中文轻量摘要",
      "relationToPreviousZh": null,
      "issueRefs": []
    }
  ],
  "globalIssues": [
    {
      "id": "issue_1",
      "type": "main_idea_drift | repetition | jump | weak_transition | unclear_progression | insufficient_topic_response",
      "severity": "low | medium | high",
      "titleZh": "中文问题标题",
      "paragraphIds": ["p1"],
      "explanationZh": "中文解释",
      "suggestionZh": "中文下一步建议"
    }
  ],
  "nextActions": [
    {
      "targetParagraphIds": ["p1"],
      "actionZh": "中文优先修改建议"
    }
  ]
}

Important:
- Preserve the paragraphId, index, and range values from the input paragraphs exactly.
- globalIssues must only describe document-level structure issues.
- Do not include revisedDocument, revisedParagraph, finalSentence, score, grade, learningItems, correctionEvents, Markdown, or HTML.
 - Return only JSON.`;
}

export function buildWritingDomainClassifierUserPrompt(input: ClassifyWritingDomainInput): string {
  return `Input variables:
Title: ${input.title}
Outline points: ${(input.outlinePoints ?? []).join(" / ")}
Full text: ${input.fullText}

Allowed domains:
- technology
- personal_growth
- history
- art
- education
- society
- environment
- business
- custom

Return JSON exactly in this shape:
{
  "topicArea": "technology | personal_growth | history | art | education | society | environment | business | custom",
  "confidence": 0.5
}

Important:
- Choose only one value from allowed domains.
- If the writing is too short, unclear, or mixed, return custom.
- Return only JSON.`;
}
