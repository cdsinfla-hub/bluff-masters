'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../questions.json');
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

test('expanded bank contains 1,000 attributed additions and the original 30', () => {
  assert.equal(bank.length, 1030);
  assert.equal(bank.slice(0,30).filter(q => !q.source).length,30);
  assert.equal(bank.slice(30).filter(q => q.source === 'Open Trivia Database').length,1000);
  const prompts = new Set();
  for (const q of bank) {
    assert.equal(typeof q.prompt,'string');
    assert.ok(q.prompt.trim() && q.prompt.length <= 250, q.prompt);
    assert.equal(typeof q.answer,'string');
    assert.ok(q.answer.trim() && q.answer.length <= 100, q.prompt);
    assert.equal(q.decoys.length,3,q.prompt);
    assert.ok(q.decoys.every(d => typeof d === 'string' && d.trim() && d.length <= 100),q.prompt);
    assert.equal(new Set([q.answer,...q.decoys].map(normalize)).size,4,q.prompt);
    const prompt = normalize(q.prompt);
    assert.ok(!prompts.has(prompt),`Duplicate: ${q.prompt}`); prompts.add(prompt);
    for (const text of [q.prompt,q.answer,...q.decoys]) {
      assert.ok(!/[<>]|&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(text),`Unrendered markup: ${q.prompt}`);
      assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text),q.prompt);
    }
  }
});

test('expanded bank retains a varied set of topics and difficulty levels', () => {
  const added=bank.slice(30);
  assert.ok(new Set(added.map(q => q.category)).size>=12);
  assert.ok(added.filter(q => ['medium','hard'].includes(q.difficulty)).length>=750);
});
