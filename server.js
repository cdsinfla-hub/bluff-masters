'use strict';
const express = require('express');
const http = require('node:http');
const { randomBytes, randomInt, randomUUID } = require('node:crypto');
const { Server } = require('socket.io');
const bank = require('./questions.json');
const { choices: categoryChoices, validateCategories, buildDeck } = require('./game-categories');
const normalize = s => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function createGameServer({ duration = 60000, reconnectGrace = 90000, notify = async () => 'disabled' } = {}) {
  const history = new Map();
  const pending = new Set();
  function record(r, status) {
    const g = r.gameRecord; if (!g) return;
    if (g.status === 'in-progress') for (const p of r.players) { const entry = g.scores.find(x => x.id === p.id); if (entry) entry.score = p.score; }
    if (status && g.status === 'in-progress') {
      g.status = status; g.endedAt = new Date().toISOString(); g.emailStatus = 'pending';
      const copy = structuredClone(g);
      const job = Promise.resolve().then(() => notify(copy)).then(result => { g.emailStatus = result || 'accepted'; }, () => { g.emailStatus = 'failed'; console.error('Game summary email failed; check email service configuration.'); }).finally(() => pending.delete(job));
      pending.add(job);
    }
    history.set(g.id, g);
    if (history.size > 200) history.delete(history.keys().next().value);
  }
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; frame-ancestors 'none'");
    next();
  });
  app.get('/health', (req, res) => res.json({ status: 'ok', questionCount: bank.length, categories: categoryChoices.filter(c => c.id !== 'potluck').map(c => ({ id: c.id, label: c.label, count: c.count })) }));
  app.get('/api/game-log', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ storage: 'temporary', records: [...history.values()].reverse().map(g => ({ ...g, scores: g.scores.map(({ name, score }) => ({ name, score })) })) }); });
  app.use(express.static(require('node:path').join(__dirname, 'public')));
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 8192 });
  const rooms = new Map();
  const active = r => r.players.filter(p => p.connected);
  const member = s => { const r = rooms.get(s.data.code); return [r, r?.players.find(p => p.id === s.data.playerId)]; };
  function snapshot(r, p) {
    return { code: r.code, phase: r.phase, hostId: r.hostId, me: p.id, round: r.round, rounds: r.rounds, deadline: r.deadline,
      gameRecord: r.gameRecord || null,
      categories: r.categories, categoryChoices, questionCategory: r.phase !== 'lobby' ? categoryChoices.find(c => c.id === r.question?.category)?.label : null,
      players: r.players.map(x => ({ id: x.id, name: x.name, score: x.score, connected: x.connected, submitted: r.lies.has(x.id), voted: r.votes.has(x.id) })),
      prompt: r.phase !== 'lobby' ? r.question?.prompt : null,
      submitted: r.lies.has(p.id), voted: r.votes.has(p.id),
      options: r.phase === 'vote' ? r.options.filter(o => !o.authors.includes(p.id)).map(o => ({ id: o.id, text: o.text })) : [],
      results: ['reveal', 'finished'].includes(r.phase) ? r.results : null };
  }
  function emit(r) { for (const p of r.players) if (p.connected) io.to(p.socketId).emit('state', snapshot(r, p)); }
  function timer(r, fn) { clearTimeout(r.timer); r.deadline = Date.now() + duration; r.timer = setTimeout(fn, duration); }
  function reveal(r) {
    clearTimeout(r.timer); r.deadline = null;
    const gains = new Map(r.players.map(p => [p.id, 0]));
    for (const [id, vote] of r.votes) {
      const option = r.options.find(o => o.id === vote);
      if (option.correct) gains.set(id, (gains.get(id) || 0) + 1000);
      else for (const author of option.authors) gains.set(author, (gains.get(author) || 0) + 500);
    }
    r.results = { answer: r.question.answer, options: r.options.map(o => ({ text: o.text, correct: o.correct, authors: o.authors.map(id => r.players.find(p => p.id === id)?.name || 'Departed player'), voters: [...r.votes].filter(([,v]) => v === o.id).map(([id]) => r.players.find(p => p.id === id)?.name || 'Departed player') })), gains: Object.fromEntries(gains) };
    for (const p of r.players) p.score += gains.get(p.id) || 0;
    r.phase = r.round >= r.rounds ? 'finished' : 'reveal';
    if (r.gameRecord) {
      r.gameRecord.completedQuestions = r.round;
      record(r, r.phase === 'finished' ? 'completed' : undefined);
    }
    emit(r);
  }
  function voting(r) {
    const grouped = new Map();
    for (const [id, text] of r.lies) {
      const key = normalize(text);
      if (!grouped.has(key)) grouped.set(key, { text, authors: [], correct: false });
      grouped.get(key).authors.push(id);
    }
    const choices = [...grouped.values(), { text: r.question.answer, authors: [], correct: true }];
    for (const text of r.question.decoys) if (choices.length < 4 && !choices.some(o => normalize(o.text) === normalize(text))) choices.push({ text, authors: [], correct: false });
    r.options = shuffle(choices).map((o,i) => ({ ...o, id: String(i) })); r.phase = 'vote'; timer(r, () => reveal(r)); emit(r);
  }
  function next(r) {
    r.round++; r.question = r.deck[r.round - 1]; r.lies = new Map(); r.votes = new Map(); r.results = null; r.phase = 'lie'; timer(r, () => voting(r)); emit(r);
  }
  function maybeAdvance(r) {
    const players = active(r);
    if (players.length && r.phase === 'lie' && players.every(p => r.lies.has(p.id))) voting(r);
    else if (players.length && r.phase === 'vote' && players.every(p => r.votes.has(p.id))) reveal(r);
  }
  function remove(r, p) {
    clearTimeout(p.expiry); record(r); r.players = r.players.filter(x => x !== p);
    if (!r.players.length) { record(r, 'ended-early'); clearTimeout(r.timer); rooms.delete(r.code); return; }
    if (r.hostId === p.id) r.hostId = (active(r)[0] || r.players[0]).id;
    maybeAdvance(r); emit(r);
  }
  io.on('connection', socket => {
    let budget = 0, windowStart = Date.now();
    function handle(event, fn) { socket.on(event, (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        if (Date.now() - windowStart > 10000) { budget = 0; windowStart = Date.now(); }
        if (++budget > 40) throw Error('Slow down and try again.');
        fn(data || {}, reply);
      } catch (e) { reply({ error: e.message }); }
    }); }
    function requireMember(host = false) { const [r,p] = member(socket); if (!r || !p) throw Error('Join a room first.'); if (host && r.hostId !== p.id) throw Error('Only the host can do that.'); return [r,p]; }
    handle('join', (data, ack) => {
      if (socket.data.code) throw Error('Leave your current room first.');
      const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
      let r = rooms.get(code);
      if (data.create) {
        const candidate = typeof data.name === 'string' ? data.name.trim() : '';
        if (!candidate || candidate.length > 20 || /[\p{C}]/u.test(candidate)) throw Error('Use a name of 1–20 characters.');
        if (rooms.size >= 500) throw Error('Server is full. Try again later.');
        let fresh; do { fresh = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(fresh));
        r = { code: fresh, players: [], phase: 'lobby', round: 0, rounds: 5, categories: ['potluck'], lies: new Map(), votes: new Map(), deadline: null }; rooms.set(fresh, r);
      }
      if (!r) throw Error('Room not found. Check the code.');
      let p = r.players.find(x => typeof data.token === 'string' && x.token === data.token);
      if (p) {
        if (p.connected) throw Error('This player is already connected in another tab.');
        clearTimeout(p.expiry); p.connected = true; p.socketId = socket.id;
      } else {
        if (typeof data.token === 'string') throw Error('Your saved seat has expired. Join the room again.');
        if (r.phase !== 'lobby') throw Error('This game has started. Ask the host to return to the lobby.');
        if (r.players.length >= 8) throw Error('Room is full (8 players).');
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (!name || name.length > 20 || /[\p{C}]/u.test(name)) throw Error('Use a name of 1–20 characters.');
        if (r.players.some(x => normalize(x.name) === normalize(name))) throw Error('That name is already taken.');
        p = { id: randomBytes(8).toString('hex'), token: randomBytes(24).toString('hex'), name, score: 0, socketId: socket.id, connected: true }; r.players.push(p);
        if (!r.hostId) r.hostId = p.id;
      }
      socket.data.code = r.code; socket.data.playerId = p.id;
      ack({ token: p.token, code: r.code }); emit(r);
    });
    handle('configure', (data, ack) => {
      const [r] = requireMember(true);
      if (r.phase !== 'lobby') throw Error('Change categories and game length in the lobby.');
      const categories = validateCategories(data.categories === undefined ? r.categories : data.categories);
      const rounds = data.rounds === undefined ? r.rounds : data.rounds;
      if (![3,5,10].includes(rounds)) throw Error('Choose 3, 5, or 10 rounds.');
      r.categories = categories; r.rounds = rounds; emit(r); ack({ ok: true });
    });
    handle('start', (data, ack) => {
      const [r] = requireMember(true); if (r.phase !== 'lobby' || active(r).length < 2) throw Error('Start from the lobby with at least 2 connected players.');
      if (![3,5,10].includes(data.rounds)) throw Error('Choose 3, 5, or 10 rounds.');
      const categories = validateCategories(data.categories === undefined ? r.categories : data.categories);
      const deck = buildDeck(categories, data.rounds);
      r.gameRecord = { id: randomUUID(), roomCode: r.code, players: active(r).map(p => p.name), scores: active(r).map(p => ({ id: p.id, name: p.name, score: 0 })), emailStatus: 'waiting', startedAt: new Date().toISOString(), plannedQuestions: data.rounds, completedQuestions: 0, status: 'in-progress', endedAt: null };
      r.categories = categories; r.rounds = data.rounds; r.round = 0; r.deck = deck; r.players.forEach(p => { p.score = 0; }); record(r); next(r); ack({ ok: true });
    });
    handle('lie', (data, ack) => {
      const [r,p] = requireMember(); if (r.phase !== 'lie' || r.lies.has(p.id)) throw Error('You cannot submit now.');
      const value = typeof data.text === 'string' ? data.text.trim().replace(/\s+/g, ' ') : '';
      if (!value || value.length > 100 || !normalize(value)) throw Error('Enter an answer of 1–100 characters.');
      if ([r.question.answer, ...(r.question.alternateSpellings || [])].some(answer => normalize(value) === normalize(answer))) throw Error('That is the truth! Invent a different answer.');
      r.lies.set(p.id, value); ack({ ok: true }); maybeAdvance(r); emit(r);
    });
    handle('vote', (data, ack) => {
      const [r,p] = requireMember(); const option = r.options?.find(o => o.id === data.id);
      if (r.phase !== 'vote' || r.votes.has(p.id) || !option || option.authors.includes(p.id)) throw Error('Choose another answer. You cannot vote for your own bluff.');
      r.votes.set(p.id, option.id); ack({ ok: true }); maybeAdvance(r); emit(r);
    });
    handle('advance', (data, ack) => {
      const [r] = requireMember(true);
      if (r.phase === 'lie') voting(r); else if (r.phase === 'vote') reveal(r); else if (r.phase === 'reveal') next(r); else throw Error('Cannot advance now.'); ack({ ok: true });
    });
    handle('reset', (data, ack) => { const [r] = requireMember(true); clearTimeout(r.timer); record(r, 'ended-early'); Object.assign(r, { phase: 'lobby', round: 0, deadline: null, results: null, lies: new Map(), votes: new Map() }); r.players.forEach(p => { p.score = 0; }); emit(r); ack({ ok: true }); });
    handle('kick', (data, ack) => {
      const [r,p] = requireMember(true); const target = r.players.find(x => x.id === data.id);
      if (!target || target === p) throw Error('Choose another player.');
      const s = io.sockets.sockets.get(target.socketId); if (s) { s.emit('removed'); s.data = {}; } remove(r, target); ack({ ok: true });
    });
    handle('leave', (data, ack) => { const [r,p] = requireMember(); socket.data = {}; remove(r,p); ack({ ok: true }); });
    socket.on('disconnect', () => {
      const [r,p] = member(socket); if (!r || !p) return;
      p.connected = false; if (r.hostId === p.id && active(r).length) r.hostId = active(r)[0].id;
      p.expiry = setTimeout(() => remove(r,p), reconnectGrace); maybeAdvance(r); emit(r);
    });
  });
  async function close() { for (const r of rooms.values()) record(r, 'interrupted'); await Promise.allSettled([...pending]); await new Promise(resolve => io.close(resolve)); for (const r of rooms.values()) { clearTimeout(r.timer); r.players.forEach(p => clearTimeout(p.expiry)); } }
  return { app, server, io, rooms, close };
}
if (require.main === module) {
  const { createEmailNotifier } = require('./game-email');
  const game = createGameServer({ notify: createEmailNotifier(process.env) }); game.server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Bluff Masters is ready'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => game.close().then(() => process.exit(0)));
}
module.exports = { createGameServer };
