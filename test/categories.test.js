'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {catalog,choices,validateCategories,buildDeck}=require('../game-categories');
const bank=require('../questions.json');

test('each category selection draws unique questions only from its chosen topics',()=>{
  const topics=catalog.filter(c=>c.id!=='potluck');
  // Every nonempty combination of the nine selectable topics.
  for(let mask=1;mask<(1<<topics.length);mask++){
    const ids=topics.filter((_,i)=>mask&(1<<i)).map(c=>c.id);
    const deck=buildDeck(ids,10);
    assert.equal(deck.length,10);
    assert.equal(new Set(deck.map(q=>q.prompt)).size,10);
    assert.ok(deck.every(q=>ids.includes(q.category)));
    const counts=ids.map(id=>deck.filter(q=>q.category===id).length);
    assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  }
  for(const c of topics) for(const rounds of [3,5,10]) assert.ok(buildDeck([c.id],rounds).every(q=>q.category===c.id));
});
test('Potluck mixes all nine topics and exposes accurate counts without questions',()=>{
  const deck=buildDeck(['potluck'],10);
  assert.equal(new Set(deck.map(q=>q.category)).size,9);
  assert.equal(new Set(deck.map(q=>q.prompt)).size,10);
  assert.equal(choices.at(-1).count,2030);
  for(const c of choices.slice(0,-1)) assert.equal(c.count,bank.filter(q=>q.category===c.id).length);
  assert.ok(!JSON.stringify(choices).includes('answer'));
});
test('invalid selections are rejected instead of falling back to the full bank',()=>{
  for(const input of [[],null,'music',['unknown'],['potluck','music'],[1],Array(11).fill('music')]) assert.throws(()=>validateCategories(input));
  assert.deepEqual(validateCategories(['music','music']),['music']);
  assert.throws(()=>buildDeck(['music'],100000));
});
