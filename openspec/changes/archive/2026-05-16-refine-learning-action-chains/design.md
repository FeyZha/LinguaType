# Design

## Product Loop

The product loop remains:

```text
write naturally
-> improve only the current/latest sentence
-> user reviews diff
-> user applies or cancels
-> learning data is saved only after Apply or explicit Save to Library
-> later writing can recall saved expression memory
```

## Implementation Boundaries

- Archive switching is local document navigation. It must not call domain classification or any other LLM route.
- Inline topic/outline confirmation may run outline check only when the user saves a topic or an edited outline point. Adding or deleting outline fields is local structure editing and must not call LLM.
- Placeholder suggestions may prepare suggestions, but Learning Library writes must stay gated by Apply and background learning extraction, or by explicit selection Save.
- Local Proofreading Signals stay inside local code. The UI exposes a collapsed bottom entry and an expanded lightweight popover.
- Current Sentence suggestions should avoid duplicating the same original/revised sentence in multiple blocks. The inline card should present one lightweight diff surface, use small replacement markers for changed tokens, and keep Apply/Cancel/Regenerate/Copy controls at the bottom of the card.
- Bottom status menus and proofreading popovers should use the same dismissable-layer behavior: Escape and outside pointer interactions close the transient layer.
- Motion should follow the existing Anime.js WAAPI usage and pass Anime.js `ease` values instead of raw browser `easing` strings that can fail at runtime.
- Learning Library and Writing Habits changes are presentation-level refinements unless a behavior bug requires storage changes.

## Test Strategy

- Add regression tests around fetch calls for local archive/setup actions.
- Add UI tests for the proofreading status-bar expansion.
- Add UI tests for diff-only current sentence suggestions, bottom action placement, safe menu motion, and outside-click dismissal.
- Keep targeted component tests as the primary verification path.
