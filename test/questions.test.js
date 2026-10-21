'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bank = require('../questions.json');
const catalog = require('../categories.json');
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

test('expanded bank retains previous questions and adds 331 uploaded oddities', () => {
  assert.equal(bank.length, 2391);
  assert.equal(bank.slice(0,30).filter(q => !q.source).length,30);
  assert.equal(bank.slice(30,2060).filter(q => ['Open Trivia Database','OpenTriviaQA','Bluff Masters'].includes(q.source)).length,2030);
  const ids = new Set(catalog.filter(c => c.id !== 'potluck').map(c => c.id));
  const prompts = new Set();
  for (const q of bank) {
    assert.ok(ids.has(q.category), `Uncategorized: ${q.prompt}`);
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

test('uploaded questions have playable blanks, aliases, and distinct server-side decoys', () => {
  const rows = bank.filter(q => q.source === 'User-provided upload');
  assert.equal(rows.length, 331);
  assert.equal(rows.filter(q => q.sourceRound === 'normal').length, 282);
  assert.equal(rows.filter(q => q.sourceRound === 'final').length, 49);
  assert.equal(rows.reduce((n, q) => n + q.alternateSpellings.length, 0), 695);
  for (const q of rows) {
    assert.equal(q.category, 'weird-wacky');
    assert.ok(q.prompt.includes('_____'));
    assert.ok(!Object.hasOwn(q, 'suggestions'));
    assert.ok(q.alternateSpellings.every(a => typeof a === 'string' && a.trim()));
    const truth = new Set([q.answer, ...q.alternateSpellings].map(normalize));
    assert.ok(q.decoys.every(d => !truth.has(normalize(d))), q.prompt);
  }
});

test('the original nine topics retain their pools and Weird & Wacky has cited facts; Potluck comes last', () => {
  const added=bank.slice(30);
  assert.equal(catalog.length,11);
  assert.equal(catalog.at(-1).id,'potluck');
  assert.equal(new Set(added.map(q => q.category)).size,10);
  for (const c of catalog.filter(c => c.id !== 'potluck')) assert.ok(bank.filter(q => q.category === c.id).length >= (c.id === 'weird-wacky' ? 30 : 200), c.label);
  assert.ok(added.filter(q => ['medium','hard'].includes(q.difficulty)).length>=750);
});

test('new oddities are original fill-in-the-blank questions with research links',()=>{const rows=bank.filter(q=>q.category==='weird-wacky' && q.source==='Bluff Masters');assert.equal(rows.length,30);for(const q of rows){assert.ok(q.prompt.includes('_____'));assert.match(q.sourceUrl,/^https:\/\//);assert.equal(q.source,'Bluff Masters');}});
