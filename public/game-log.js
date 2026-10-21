'use strict';
let records = [];
async function refresh() {
 try {
  const res = await fetch('/api/game-log',{cache:'no-store'}); if(!res.ok) throw Error();
  records = (await res.json()).records;
  const entries = document.querySelector('#log-entries'); entries.replaceChildren();
  for(const g of records) {
   const card = document.createElement('section'); card.className='panel';
   for(const text of [`${new Date(g.startedAt).toLocaleString()} - Room ${g.roomCode}`,`${g.status}: ${g.completedQuestions}/${g.plannedQuestions} questions`,...[...g.scores].sort((a,b)=>b.score-a.score).map(p=>`${p.name}: ${p.score} points`),`Email: ${g.emailStatus === 'accepted' ? 'accepted by sending service' : g.emailStatus}`]) {const p=document.createElement('p');p.textContent=text;card.append(p);}
   entries.append(card);
  }
  document.querySelector('#log-message').textContent=`${records.length} games. Refresh to see updates.`;
 } catch {document.querySelector('#log-message').textContent='Could not load the log. Please refresh.';}
}
document.querySelector('#refresh-log').onclick=refresh;
document.querySelector('#download-log').onclick=()=>{
 const quote=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 const rows=[['Room','Start UTC','End UTC','Completed','Planned','Status','Scores'],...records.map(g=>[g.roomCode,g.startedAt,g.endedAt||'',g.completedQuestions,g.plannedQuestions,g.status,g.scores.map(p=>`${p.name}: ${p.score}`).join('; ')])];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='bluff-masters-games.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
refresh();
