import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GenerateRequestSchema, LIMITS, parseGenerateResponse } from '../supabase/functions/_shared/contract.ts';

const valid = {
  replies: [
    { style: 'direct', text: 'Drinks Thursday?', why: 'Clear plan.' },
    { style: 'confident', text: 'I like where this is going.', why: 'Relaxed.' },
    { style: 'playful', text: 'Suspiciously charming.', why: 'Teasing.' },
  ],
  nextMove: 'Lock in a time.',
};

test('accepts a valid response and orders styles', () => {
  const r = parseGenerateResponse(valid);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.data.replies.map((x) => x.style), ['confident', 'playful', 'direct']);
});

test('rejects missing styles', () => {
  const r = parseGenerateResponse({ ...valid, replies: valid.replies.slice(0, 2) });
  assert.equal(r.ok, false);
});

test('rejects duplicate styles', () => {
  const r = parseGenerateResponse({ ...valid, replies: [valid.replies[0], valid.replies[0], valid.replies[1]] });
  assert.equal(r.ok, false);
});

test('rejects empty text and wrong types', () => {
  assert.equal(parseGenerateResponse({ ...valid, nextMove: '' }).ok, false);
  assert.equal(parseGenerateResponse({ ...valid, replies: 'nope' }).ok, false);
  assert.equal(parseGenerateResponse(null).ok, false);
  const bad = structuredClone(valid);
  bad.replies[0]!.text = '   ';
  assert.equal(parseGenerateResponse(bad).ok, false);
});

test('onlyStyle extracts the single requested reply', () => {
  const r = parseGenerateResponse(valid, { onlyStyle: 'playful' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.replies.length, 1);
    assert.equal(r.data.replies[0]!.style, 'playful');
  }
  const single = parseGenerateResponse({ ...valid, replies: [valid.replies[0]] }, { onlyStyle: 'direct' });
  assert.equal(single.ok, true);
});

test('request schema enforces limits', () => {
  const base = { conversation: 'hey there', objective: 'flirt', tone: 'confident' };
  assert.equal(GenerateRequestSchema.safeParse(base).success, true);
  assert.equal(GenerateRequestSchema.safeParse({ ...base, conversation: 'x'.repeat(LIMITS.conversationMaxChars + 1) }).success, false);
  assert.equal(GenerateRequestSchema.safeParse({ ...base, objective: 'manipulate' }).success, false);
  assert.equal(GenerateRequestSchema.safeParse({ ...base, conversation: ' ' }).success, false);
});
