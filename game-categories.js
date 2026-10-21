'use strict';
const { randomInt } = require('node:crypto');
const catalog = require('./categories.json');
const bank = require('./questions.json');
const topics = catalog.filter(c => c.id !== 'potluck');
const choices = catalog.map(c => ({ ...c, count: c.id === 'potluck' ? bank.length : bank.filter(q => q.category === c.id).length }));
function validateCategories(value) {
  if (!Array.isArray(value) || !value.length || value.length > catalog.length || value.some(id => typeof id !== 'string' || !catalog.some(c => c.id === id))) throw Error('Choose at least one valid category.');
  const unique = [...new Set(value)];
  if (unique.includes('potluck') && unique.length > 1) throw Error('Choose Potluck by itself or select specific categories.');
  return catalog.filter(c => unique.includes(c.id)).map(c => c.id);
}
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = randomInt(i + 1); [out[i],out[j]] = [out[j],out[i]]; }
  return out;
}
function buildDeck(selection, rounds) {
  const selected = validateCategories(selection);
  const ids = selected.includes('potluck') ? topics.map(c => c.id) : selected;
  const buckets = new Map(ids.map(id => [id, shuffle(bank.filter(q => q.category === id))]));
  if ([...buckets.values()].reduce((n,items) => n + items.length, 0) < rounds) throw Error('Not enough questions in those categories for this game.');
  const deck = [];
  while (deck.length < rounds) for (const id of shuffle(ids.filter(id => buckets.get(id).length))) {
    if (deck.length === rounds) break;
    deck.push(buckets.get(id).pop());
  }
  return deck;
}
module.exports = { catalog, choices, validateCategories, buildDeck };
