import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const { app, BUSINESS, promptForChannel } = await import('./server.js');
const { buildGhlPayload, INTENTS } = await import('./intent-core.js');
assert.equal(BUSINESS.phone, '970.517.4536');
assert.equal(BUSINESS.bookingUrl, 'https://www.vagaro.com/dtmzh6/services');
assert.equal(BUSINESS.website, 'https://painisntnormal.com');
for (const channel of ['web','voice']) {
 const prompt = promptForChannel(channel);
 assert.match(prompt, new RegExp(`You are ${channel === 'web' ? 'Ali' : 'Mia'}`));
 assert.match(prompt, /Complete: one 120-minute session monthly\. 6 months \$172\/month; 12 months \$164\/month/);
 for (const pair of ['102.*94','142.*134','252.*244','382.*374','352.*344']) assert.match(prompt,new RegExp(pair));
 assert.match(prompt,/\$169\/month, six-month term only/);
 assert.doesNotMatch(prompt,/682-3031|\$97\/mo|\$149\/mo|\$229\/mo|\$349\/mo/);
}
assert.match(promptForChannel('web'),/Do not solicit symptoms/);
assert.match(promptForChannel('voice'),/Do not identify yourself as Ali/);
const fetchOriginal = globalThis.fetch;
process.env.OPENAI_API_KEY = 'local-test-only';
delete process.env.LEAD_WEBHOOK_URL; delete process.env.ANALYTICS_WEBHOOK_URL;
const calls=[];
globalThis.fetch = async (url, options) => {
 assert.equal(url, 'https://api.openai.com/v1/chat/completions');
 const body=JSON.parse(options.body);calls.push(body);
 const identity=body.messages[0].content.startsWith('\nYou are Ali') ? 'Ali' : 'Mia';
 const turn={reply:`I am ${identity}.`,intent:INTENTS.INFO,intentConfidence:1,platformAgent:'',qualifiedLead:false,bookingAttempt:false,bookingHandoff:false,bookingOutcome:'none',humanEscalation:false,resolvedWithoutHuman:true,shouldCreateOrUpdateGhl:false,customer:{},vendor:{},summary:'General service question'};
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(turn)}}]}),{status:200});
};
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try {
 for (const [route,identity] of [['/chat','Ali'],['/voice/turn','Mia']]) {
  const r=await fetchOriginal(`http://127.0.0.1:${server.address().port}${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'What services do you offer?'}]})});
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.assistant,identity);assert.equal(data.reply,`I am ${identity}.`);assert.equal(data.bookingUrl,BUSINESS.bookingUrl);assert.equal(data.ghl.sent,false);
 }
 assert.equal(calls.length,2);
 const turn={intent:INTENTS.PROSPECT,platformAgent:'',customer:{},summary:''};
 assert.ok(buildGhlPayload(turn,{channel:'web'}).tags.includes('Ali - Prospective Client'));
 assert.ok(buildGhlPayload(turn,{channel:'voice'}).tags.includes('Mia - Prospective Client'));
} finally {globalThis.fetch=fetchOriginal;await new Promise(r=>server.close(r));}
console.log('PASS current business facts, all plan rates, distinct Ali/Mia prompts, HTTP routing, CRM labels; outbound calls mocked.');
