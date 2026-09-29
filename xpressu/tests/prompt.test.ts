import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildUserPrompt, RESPONSE_JSON_SCHEMA, SYSTEM_PROMPT } from '../supabase/functions/_shared/prompt.ts';

test('system prompt carries the consent/boundary rules', () => {
  assert.match(SYSTEM_PROMPT, /Never assume the other person's feelings/);
  assert.match(SYSTEM_PROMPT, /"boundary"/);
  assert.match(SYSTEM_PROMPT, /CONFIDENT, PLAYFUL, DIRECT/);
});

test('user prompt includes objective, style, avoid list and conversation', () => {
  const p = buildUserPrompt({
    conversation: 'Them: what are you up to this weekend?',
    objective: 'ask_out',
    tone: 'funny',
    userStyle: { samples: 'lol ok', emoji: 'never', casing: 'lowercase', length: 'short', notes: '' },
    avoid: ['Drinks Friday?'],
    onlyStyle: 'playful',
  });
  assert.match(p, /Ask them out/);
  assert.match(p, /mostly lowercase/);
  assert.match(p, /Drinks Friday\?/);
  assert.match(p, /Only the PLAYFUL reply/);
  assert.match(p, /this weekend/);
  assert.match(p, /Set "analysis" to null/);
});

test('json schema is strict and requires all top-level keys', () => {
  assert.equal(RESPONSE_JSON_SCHEMA.strict, true);
  assert.deepEqual([...RESPONSE_JSON_SCHEMA.schema.required].sort(), ['analysis', 'nextMove', 'replies', 'safety']);
});
