import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LIMITS } from '../supabase/functions/_shared/contract.ts';
import { keepRecent, minimizeConversation, redactContactDetails } from '../supabase/functions/_shared/minimize.ts';

test('redacts emails, phones, links and long digit runs', () => {
  const out = redactContactDetails('mail me jane.doe@gmail.com or call +1 (415) 555-0132, see https://ig.me/x and code 12345678');
  assert.ok(!out.includes('jane.doe'));
  assert.ok(!out.includes('555'));
  assert.ok(!out.includes('https'));
  assert.ok(!out.includes('12345678'));
  assert.match(out, /\[email\]/);
  assert.match(out, /\[number\]/);
  assert.match(out, /\[link\]/);
});

test('keeps normal text intact', () => {
  const s = 'Them: I ran 5k today and got 2 coffees';
  assert.equal(redactContactDetails(s), s);
});

test('keeps only the most recent part of long conversations', () => {
  const lines = Array.from({ length: 400 }, (_, i) => `line ${i}: hello there`);
  const out = keepRecent(lines.join('\n'));
  assert.ok(out.length <= LIMITS.conversationSentChars);
  assert.ok(out.endsWith('line 399: hello there'));
  assert.ok(out.startsWith('line '), 'cuts at a line boundary');
});

test('minimize respects redact option', () => {
  assert.match(minimizeConversation('a@b.co hi', { redact: true }), /\[email\]/);
  assert.match(minimizeConversation('a@b.co hi', { redact: false }), /a@b\.co/);
});
