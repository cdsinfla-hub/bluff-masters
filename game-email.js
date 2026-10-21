'use strict';
function summary(g, zone = 'America/New_York') {
 const time = v => new Intl.DateTimeFormat('en-US', {dateStyle:'full',timeStyle:'long',timeZone:zone}).format(new Date(v));
 return [`Bluff Masters: ${g.status}`,`Room: ${g.roomCode}`,`Started: ${time(g.startedAt)}`,`Ended: ${time(g.endedAt)}`,`Questions completed: ${g.completedQuestions} of ${g.plannedQuestions}`,'','Final scores:',...[...g.scores].sort((a,b)=>b.score-a.score).map(p=>`${p.name}: ${p.score} points`)].join('\n');
}
function createEmailNotifier(env, request = fetch) {
 if (!env.RESEND_API_KEY || !env.GAME_ALERT_TO || !env.GAME_ALERT_FROM) return async () => 'disabled';
 return async g => {
  const response = await request('https://api.resend.com/emails', {method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`game-summary-${g.id}`},body:JSON.stringify({from:env.GAME_ALERT_FROM,to:[env.GAME_ALERT_TO],subject:`Bluff Masters results: ${g.completedQuestions}/${g.plannedQuestions} questions`,text:summary(g,env.GAME_ALERT_TIMEZONE || 'America/New_York')})});
  if (!response.ok) throw Error(`Email service returned ${response.status}`);
  return 'accepted';
 };
}
module.exports = {summary,createEmailNotifier};
