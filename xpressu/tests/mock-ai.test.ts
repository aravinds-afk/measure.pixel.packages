import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateMockResponse } from '../services/ai/mockProvider.ts';
import { parseGenerateResponse } from '../supabase/functions/_shared/contract.ts';

const base = { objective: 'keep_going', tone: 'confident' } as const;

test('mock output always passes contract validation', () => {
  const objectives = ['keep_going', 'flirt', 'ask_out', 'recover_dry', 'answer_question', 'move_to_date', 'end_gracefully'] as const;
  for (const objective of objectives) {
    for (let i = 0; i < 10; i++) {
      const res = generateMockResponse({ ...base, objective, conversation: 'Them: I just got back from climbing in Yosemite!', includeAnalysis: i % 2 === 0 });
      const parsed = parseGenerateResponse(res);
      assert.equal(parsed.ok, true, `invalid for ${objective}: ${parsed.ok ? '' : parsed.error}`);
    }
  }
});

test('boundary signals produce respectful replies', () => {
  const res = generateMockResponse({ ...base, objective: 'ask_out', conversation: 'Me: drinks?\nThem: sorry, not interested. please stop texting me' });
  assert.equal(res.safety?.signal, 'boundary');
  for (const r of res.replies) assert.doesNotMatch(r.text, /drink|date|coffee|\?/i);
});

test('low effort replies are flagged', () => {
  const res = generateMockResponse({ ...base, conversation: 'Me: how was your weekend?\nThem: k' });
  assert.equal(res.safety?.signal, 'low_interest');
});

test('regenerate avoids previous suggestions when alternatives exist', () => {
  const conversation = 'Them: I love hiking';
  const first = generateMockResponse({ ...base, objective: 'ask_out', conversation, onlyStyle: 'direct' });
  const prev = first.replies[0]!.text;
  for (let i = 0; i < 10; i++) {
    const next = generateMockResponse({ ...base, objective: 'ask_out', conversation, onlyStyle: 'direct', avoid: [prev] });
    assert.notEqual(next.replies[0]!.text, prev);
  }
});

test('applies lowercase / no-emoji user style', () => {
  const res = generateMockResponse({
    ...base,
    objective: 'flirt',
    conversation: 'Them: haha you are funny',
    userStyle: { samples: '', emoji: 'never', casing: 'lowercase', length: 'short', notes: '' },
  });
  for (const r of res.replies) {
    assert.equal(r.text, r.text.toLowerCase());
    assert.doesNotMatch(r.text, /\p{Extended_Pictographic}/u);
  }
});
