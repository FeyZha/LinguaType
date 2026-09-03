import assert from 'node:assert/strict';
import test from 'node:test';
import { selectionIsInsideSentence } from '../app/sentence-tracking.ts';

const sentence = { text: 'A resolved sentence.', start: 10, end: 30 };

test('keeps sentence focus only while the selection remains inside it', () => {
  assert.equal(selectionIsInsideSentence(sentence, { start: 18, end: 18 }), true);
  assert.equal(selectionIsInsideSentence(sentence, { start: 10, end: 30 }), true);
  assert.equal(selectionIsInsideSentence(sentence, { start: 30, end: 30 }), true);
  assert.equal(selectionIsInsideSentence(sentence, { start: 31, end: 31 }), false);
  assert.equal(selectionIsInsideSentence(sentence, null), false);
});
