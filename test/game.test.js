'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { createGameServer } = require('../server');
const bank = require('../questions.json');
const pause = ms => new Promise(r => setTimeout(r,ms));
async function setup(t, options) {
  const game = createGameServer(options); await new Promise(r => game.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${game.server.address().port}`; const clients = [];
  t.after(async () => { clients.forEach(c => c.disconnect()); await game.close(); });
  async function client(name, code, token) {
    const s = io(url, { forceNew: true, reconnection: false }); clients.push(s);
    s.on('state', value => { s.latest = value; });
    await new Promise(r => s.on('connect', r));
    s.ask = (event, data = {}) => new Promise((resolve,reject) => s.timeout(2000).emit(event,data,(err,res) => err ? reject(err) : resolve(res)));
    s.session = await s.ask('join', { name, code, token, create: !code }); await pause(15); return s;
  }
  return { game, url, client };
}
test('2-player full game: privacy, permissions, self-votes, scoring, reset, HTTP', async t => {
  const { game, url, client } = await setup(t);
  assert.equal((await (await fetch(url + '/health')).json()).status, 'ok');
  assert.equal((await (await fetch(url + '/health')).json()).questionCount,2060);
  assert.match(await (await fetch(url)).text(), /BLUFF MASTERS/);
  const a = await client('Host'); const b = await client('Guest', a.session.code);
  assert.ok((await b.ask('start', { rounds:3 })).error);
  await a.ask('start', { rounds:3 }); await pause(10);
  for (let round=1; round<=3; round++) {
    assert.equal(a.latest.phase, 'lie'); assert.equal(a.latest.round, round);
    assert.equal(a.latest.results, null); assert.equal(a.latest.options.length, 0);
    const answer = bank.find(q => q.prompt === a.latest.prompt).answer;
    assert.ok((await a.ask('lie', {text:answer})).error);
    await a.ask('lie', {text:'A spectacularly fake answer'});
    assert.ok((await a.ask('lie', {text:'second answer'})).error);
    await b.ask('lie', {text:'An entirely different fake answer'}); await pause(10);
    assert.equal(a.latest.phase, 'vote');
    assert.equal(a.latest.options.some(o => o.text === 'A spectacularly fake answer'), false);
    assert.equal(JSON.stringify(a.latest).includes('"correct"'), false);
    const own = game.rooms.get(a.session.code).options.find(o => o.authors.includes(a.latest.me));
    assert.ok((await a.ask('vote', {id:own.id})).error);
    await a.ask('vote', {id:a.latest.options.find(o => o.text === answer).id});
    await b.ask('vote', {id:b.latest.options.find(o => o.text === 'A spectacularly fake answer').id}); await pause(10);
    assert.equal(a.latest.phase, round === 3 ? 'finished' : 'reveal');
    assert.equal(a.latest.results.gains[a.latest.me],1500);
    assert.equal(a.latest.players.find(p => p.id === a.latest.me).score, round * 1500);
    if(round<3) { await a.ask('advance'); await pause(10); }
  }
  await a.ask('reset'); await pause(10); assert.equal(a.latest.phase,'lobby'); assert.equal(a.latest.players[0].score,0);
});
test('8-player capacity, reconnect tokens, host transfer, removal, and cleanup', async t => {
  const { client } = await setup(t, { reconnectGrace:300 });
  const host = await client('Host'); const code = host.session.code; const players = [];
  for(let i=0;i<7;i++) players.push(await client(`Player ${i}`,code));
  const extra = await client('Ninth',code); assert.match(extra.session.error,/full/);
  const session = host.session; host.disconnect(); await pause(20);
  assert.equal(players[0].latest.hostId,players[0].latest.me);
  const resumed = await client('Ignored',code,session.token); assert.equal(resumed.session.token, session.token);
  assert.equal(resumed.latest.players.length,8);
  await players[0].ask('kick',{id:resumed.latest.me}); await pause(10);
  assert.ok((await resumed.ask('start',{rounds:3})).error);
  const added = await client('New guest',code); assert.ok(added.session.token);
  added.disconnect(); await pause(350); assert.equal(players[0].latest.players.length,7);
});
test('timers advance idle rounds; duplicate bluffs credit each author', async t => {
  const { client } = await setup(t,{duration:250});
  const a = await client('Host'); const b = await client('Guest',a.session.code); const c = await client('Third',a.session.code);
  await a.ask('start',{rounds:3}); await pause(290); assert.equal(a.latest.phase,'vote');
  await pause(290); assert.equal(a.latest.phase,'reveal');
  await a.ask('advance'); await a.ask('lie',{text:'Same fake'}); await b.ask('lie',{text:'same fake!'}); await c.ask('lie',{text:'Other fake'}); await pause(10);
  assert.equal(a.latest.options.some(o => /same fake/i.test(o.text)),false);
  await c.ask('vote',{id:c.latest.options.find(o => /same fake/i.test(o.text)).id});
  await a.ask('advance'); await pause(10);
  assert.equal(a.latest.results.gains[a.latest.me],500); assert.equal(b.latest.results.gains[b.latest.me],500);
});

test('host category settings sync, survive host transfer, and constrain the game', async t => {
  const { game,client } = await setup(t);
  const a=await client('Host'); const b=await client('Guest',a.session.code);
  await client('Third player',a.session.code);
  assert.deepEqual(a.latest.categories,['potluck']);
  assert.equal(a.latest.categoryChoices.length,11);
  assert.equal(a.latest.categoryChoices.at(-1).id,'potluck');
  assert.ok((await b.ask('configure',{categories:['music']})).error);
  for (const categories of [[],['missing'],['music','potluck'],null,'music']) {
    assert.ok((await a.ask('configure',{categories})).error);
    assert.ok((await a.ask('start',{rounds:3,categories})).error);
  }
  assert.deepEqual((await a.ask('configure',{rounds:10,categories:['music','animals-nature']})),{ok:true});
  await pause(10); assert.deepEqual(b.latest.categories,['animals-nature','music']);
  assert.equal(b.latest.rounds,10);
  a.disconnect(); await pause(20); assert.equal(b.latest.hostId,b.latest.me);
  assert.deepEqual(b.latest.categories,['animals-nature','music']);
  await b.ask('start',{rounds:10}); await pause(10);
  const deck=game.rooms.get(b.session.code).deck;
  assert.equal(deck.length,10); assert.equal(deck.filter(q=>q.category==='music').length,5);
  assert.equal(deck.filter(q=>q.category==='animals-nature').length,5);
  assert.equal(b.latest.results,null); assert.ok(b.latest.questionCategory);
  assert.ok((await b.ask('configure',{categories:['history-myth']})).error);
  await b.ask('reset'); await pause(10);
  assert.deepEqual(b.latest.categories,['animals-nature','music']);
  await b.ask('configure',{categories:['food-everyday'],rounds:3});
  await b.ask('start',{rounds:3}); await pause(10);
  assert.ok(game.rooms.get(b.session.code).deck.every(q=>q.category==='food-everyday'));
});

test('five-question shared log and end-only email retain final scores after reset', async t => {
 const sent=[]; const {game,url,client}=await setup(t,{notify:async g=>{sent.push(g);return 'accepted';}});
 const a=await client('Host');await client('Friend',a.session.code);
 await a.ask('start',{rounds:5});assert.equal(sent.length,0);
 for(let i=0;i<5;i++) {
  await a.ask('advance');
  const r=game.rooms.get(a.session.code);const truth=r.options.find(o=>o.correct);
  await a.ask('vote',{id:truth.id}); await a.ask('advance');
  if(i<4) await a.ask('advance');
 }
 await pause(15);assert.equal(sent.length,1);assert.equal(sent[0].completedQuestions,5);
 assert.equal(sent[0].scores.find(p=>p.name==='Host').score,5000);
 await a.ask('reset');await pause(10);
 const log=await(await fetch(url+'/api/game-log')).json();
 assert.equal(log.records.length,1);assert.equal(log.records[0].scores[0].score,5000);
 assert.equal(log.records[0].emailStatus,'accepted');assert.equal(sent.length,1);
 assert.ok(!JSON.stringify(log).includes('token'));
 await a.ask('start',{rounds:5});await a.ask('reset');await pause(10);
 assert.equal(sent.length,2);assert.equal(sent[1].status,'ended-early');assert.equal(sent[1].completedQuestions,0);
});
