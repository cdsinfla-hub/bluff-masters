'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createEmailNotifier}=require('../game-email');
test('email sends final scores via HTTPS without exposing credentials; disabled and errors',async()=>{
 const g={id:'test',roomCode:'ABCDEF',status:'completed',startedAt:'2026-10-21T12:00:00Z',endedAt:'2026-10-21T12:10:00Z',completedQuestions:5,plannedQuestions:5,scores:[{name:'Friend',score:2500}]};
 assert.equal(await createEmailNotifier({})(g),'disabled');
 let payload;const env={RESEND_API_KEY:'secret',GAME_ALERT_TO:'test@example.com',GAME_ALERT_FROM:'sender@example.com'};
 const send=createEmailNotifier(env,async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');payload=JSON.parse(options.body);assert.equal(options.headers['Idempotency-Key'],'game-summary-test');return{ok:true};});
 assert.equal(await send(g),'accepted');assert.match(payload.text,/Friend: 2500 points/);assert.match(payload.text,/5 of 5/);assert.ok(!JSON.stringify(payload).includes('secret'));
 await assert.rejects(createEmailNotifier(env,async()=>({ok:false,status:403}))(g));
});
