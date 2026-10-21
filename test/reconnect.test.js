'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function browser(reply, saved = { code: 'ABC123', token: 'old-token' }) {
  const nodes = new Map(); const handlers = {}; const calls = [];
  let stored = JSON.stringify(saved);
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: id === 'game', value: '', textContent: '', reportValidity: () => true });
    return nodes.get(id);
  };
  const socket = { connected: true, on: (name, fn) => { handlers[name] = fn; }, timeout: () => ({ emit: (event, data, ack) => { calls.push({ event, data }); ack(null, reply); } }) };
  const context = { document: { getElementById: node }, io: () => socket,
    sessionStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => { stored = null; } },
    location: { search: '' }, URLSearchParams, setInterval: () => {} };
  vm.runInNewContext(readFileSync(require.resolve('../public/app.js'), 'utf8'), context);
  return { node, handlers, calls, stored: () => stored };
}

for (const error of ['Room not found. Check the code.', 'Your saved seat has expired. Join the room again.']) {
  test(`launch clears expired session quietly: ${error}`, async () => {
    const b = browser({ error });
    b.handlers.connect(); await new Promise(setImmediate);
    assert.equal(b.stored(), null);
    assert.equal(b.node('notice').textContent, '');
    assert.equal(b.node('entry').hidden, false);
    assert.equal(b.node('game').hidden, true);
    assert.equal(b.node('rejoin').hidden, true);
    b.handlers.connect(); await new Promise(setImmediate);
    assert.equal(b.calls.length, 1);
  });
}

test('manual invalid room still displays an error', async () => {
  const b = browser({ error: 'Room not found. Check the code.' }, null);
  b.node('code').value = 'BAD123'; b.node('name').value = 'Guest';
  b.node('join-form').onsubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(b.node('notice').textContent, 'Room not found. Check the code.');
});

test('valid saved rooms reconnect and temporary join failures keep the session', async () => {
  const valid = browser({ code: 'ABC123', token: 'old-token' });
  valid.handlers.connect(); await new Promise(setImmediate);
  assert.equal(JSON.parse(valid.stored()).code, 'ABC123');
  assert.equal(valid.calls[0].data.token, 'old-token');
  const busy = browser({ error: 'This player is already connected in another tab.' });
  busy.handlers.connect(); await new Promise(setImmediate);
  assert.ok(busy.stored());
  assert.match(busy.node('notice').textContent, /another tab/);
});
