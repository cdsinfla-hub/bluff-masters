'use strict';
const $ = id => document.getElementById(id);
const socket = io();
let state, saved;
try { saved = JSON.parse(sessionStorage.getItem('bluff-session')); } catch {}
function save(value) { saved = value; try { if (value) sessionStorage.setItem('bluff-session', JSON.stringify(value)); else sessionStorage.removeItem('bluff-session'); } catch {} }
function notice(text) { $('notice').textContent = text; }
function send(event, data = {}) { return new Promise(resolve => socket.timeout(10000).emit(event, data, (err, result) => { if (err) { notice('Connection interrupted. Please try again.'); resolve(null); } else if (result?.error) { notice(result.error); resolve(null); } else { notice(''); resolve(result); } })); }
async function join(create = false, resume = false) {
  if (!socket.connected) return notice('Waiting for a connection…');
  if (!resume && !$('name').reportValidity()) return;
  if (!create && !resume && !$('code').reportValidity()) return;
  const result = await send('join', resume ? { code: saved.code, token: saved.token } : { create, code: $('code').value, name: $('name').value });
  if (result) { save(result); $('lie').value = ''; }
}
const inviteCode = new URLSearchParams(location.search).get('room');
if (inviteCode) $('code').value = inviteCode.slice(0,6);
$('rejoin').hidden = !saved;
$('join-form').onsubmit = e => { e.preventDefault(); join(); };
$('create').onclick = () => join(true);
$('rejoin').onclick = () => saved && join(false,true);
socket.on('connect', () => { $('connection').textContent = '● Connected'; if (saved) join(false,true); });
socket.on('disconnect', () => { $('connection').textContent = '○ Reconnecting…'; notice('Connection lost. Reconnecting automatically; your seat is held for 90 seconds.'); });
socket.on('connect_error', () => { $('connection').textContent = '○ Server unavailable'; notice('Trying to reach the server. A free host may need a minute to wake up.'); });
socket.on('removed', () => { save(null); state = null; $('entry').hidden = false; $('game').hidden = true; $('rejoin').hidden = true; notice('The host removed you from the room.'); });
$('leave').onclick = async () => { if (await send('leave')) { save(null); state = null; $('entry').hidden = false; $('game').hidden = true; $('rejoin').hidden = true; } };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/?room=${state.code}`); notice('Invite link copied. Send it to your friends!'); } catch { notice(`Share room code ${state.code} and this page's address.`); } };
function selectedCategories() { return [...$('categories').querySelectorAll('input:checked')].map(input => input.value); }
$('start').onclick = () => send('start', { rounds: Number($('rounds').value), categories: selectedCategories() });
$('rounds').onchange = () => send('configure', { rounds: Number($('rounds').value) });
let categoryCatalogKey;
function renderCategories(s) {
  const key = JSON.stringify(s.categoryChoices);
  if (key !== categoryCatalogKey) {
    $('categories').replaceChildren(); categoryCatalogKey = key;
    for (const category of s.categoryChoices) {
      const label = el('label', null, `category-option${category.id === 'potluck' ? ' potluck' : ''}`);
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = category.id; input.name = 'categories';
      const text = el('span'); text.append(el('strong', category.label), el('small', `${category.count.toLocaleString()} questions · ${category.description}`));
      input.onchange = async () => {
        const inputs = [...$('categories').querySelectorAll('input')];
        if (input.checked) for (const other of inputs) if (input.value === 'potluck' ? other !== input : other.value === 'potluck') other.checked = false;
        const selected = selectedCategories();
        if (!selected.length) { input.checked = true; return notice('Keep at least one category selected, or choose Potluck.'); }
        if (!await send('configure', { categories: selected })) for (const other of inputs) other.checked = state.categories.includes(other.value);
      };
      label.append(input,text); $('categories').append(label);
    }
  }
  for (const input of $('categories').querySelectorAll('input')) input.checked = s.categories.includes(input.value);
  $('rounds').value = String(s.rounds);
  const labels = s.categoryChoices.filter(c => s.categories.includes(c.id)).map(c => c.label);
  $('category-summary').textContent = s.phase === 'lobby' ? `${s.rounds} questions · ${labels.join(' + ')}` : s.questionCategory;
}
$('advance').onclick = () => send('advance');
$('reset').onclick = () => { if (confirm('Return everyone to the lobby and reset scores?')) send('reset'); };
$('lie-form').onsubmit = async e => { e.preventDefault(); if (await send('lie', { text: $('lie').value })) $('lie').value = ''; };
function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
socket.on('state', s => {
  const oldRound = state?.round; state = s; if (oldRound !== s.round) $('lie').value = '';
  $('entry').hidden = true; $('game').hidden = false; $('room-code').textContent = s.code;
  $('round').textContent = s.phase === 'lobby' ? 'GATHER YOUR PEOPLE' : `ROUND ${s.round} / ${s.rounds}`;
  const titles = { lobby: 'A good lie needs an audience.', lie: 'Make it believable.', vote: 'One of these is true.', reveal: 'The truth comes out.', finished: 'Meet your Bluff Masters.' };
  const help = { lobby: 'Share the invite. The host can start with 2–8 connected players.', lie: 'Invent a fake answer that might fool the room. You have 60 seconds.', vote: 'Choose the real answer. Your own bluff is hidden. You have 60 seconds.', reveal: 'The host can start the next round when everyone is ready.', finished: 'Same friends, fresh bluffs? The host can return everyone to the lobby.' };
  $('phase-title').textContent = titles[s.phase]; $('phase-help').textContent = help[s.phase];
  $('prompt').hidden = !s.prompt; $('prompt').textContent = s.prompt || '';
  $('lie-form').hidden = s.phase !== 'lie' || s.submitted;
  $('waiting').hidden = !((s.phase === 'lie' && s.submitted) || (s.phase === 'vote' && s.voted));
  $('waiting').textContent = s.phase === 'lie' ? 'Bluff locked in. Get your poker face ready.' : 'Vote locked in. The truth is on its way.';
  $('ballot').replaceChildren();
  if (s.phase === 'vote' && !s.voted) for (const option of s.options) { const b = el('button', option.text); b.onclick = () => send('vote', { id: option.id }); $('ballot').append(b); }
  const host = s.hostId === s.me;
  renderCategories(s);
  $('host').hidden = !host; $('settings').hidden = s.phase !== 'lobby'; $('reset').hidden = s.phase === 'lobby';
  $('start').disabled = s.players.filter(p => p.connected).length < 2;
  $('advance').hidden = !['lie','vote','reveal'].includes(s.phase);
  $('advance').textContent = s.phase === 'lie' ? 'Close submissions →' : s.phase === 'vote' ? 'Close voting →' : 'Next round →';
  $('count').textContent = `${s.players.length}/8`; $('players').replaceChildren();
  const ranked = [...s.players].sort((a,b) => b.score - a.score);
  for (const p of ranked) {
    const row = el('li', null, 'player');
    const status = !p.connected ? ' · reconnecting' : s.phase === 'lie' && p.submitted ? ' · ready ✓' : s.phase === 'vote' && p.voted ? ' · voted ✓' : '';
    row.append(el('span', `${p.name}${p.id === s.me ? ' (you)' : ''}${p.id === s.hostId ? ' ♛' : ''}${status}`, 'name'), el('span', p.score.toLocaleString(), 'score'));
    if (host && p.id !== s.me) { const b = el('button', 'Remove', 'text-button'); b.setAttribute('aria-label', `Remove ${p.name}`); b.onclick = () => { if (confirm(`Remove ${p.name}?`)) send('kick', { id: p.id }); }; row.append(b); }
    $('players').append(row);
  }
  $('results').replaceChildren();
  if (s.results) {
    if (s.phase === 'finished') { const winners = ranked.filter(p => p.score === ranked[0].score).map(p => p.name).join(' & '); $('results').append(el('p', `✦ ${winners} ${ranked.filter(p => p.score === ranked[0].score).length > 1 ? 'win' : 'wins'}!`, 'winner')); }
    for (const option of s.results.options) { const box = el('div', null, `result${option.correct ? ' correct' : ''}`); box.append(el('div', option.correct ? 'THE TRUTH' : option.authors.length ? `BLUFF BY ${option.authors.join(' & ')}` : 'HOUSE DECOY', 'eyebrow'), el('h3', option.text), el('p', option.voters.length ? `Picked by ${option.voters.join(', ')}` : 'Nobody picked this.')); $('results').append(box); }
    const gain = s.results.gains[s.me] || 0; $('results').prepend(el('p', `You earned +${gain.toLocaleString()} this round.`, 'eyebrow'));
  }
  tick();
});
function tick() { $('timer').textContent = state?.deadline ? `${Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000))}s remaining` : ''; }
setInterval(tick, 500);
