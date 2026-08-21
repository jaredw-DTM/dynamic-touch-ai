import express from "express";
import cors from "cors";
import { INTENTS, sourceFor, buildGhlPayload, eventNamesFor } from "./intent-core.js";

const app = express();

export const BUSINESS = Object.freeze({
  name: "Dynamic Touch Corrective Therapy",
  practitioner: "Ja'Red Wheeler",
  phone: "(970) 682-3031",
  address: "873 Cleveland Ave, Loveland, CO 80537",
  website: "https://www.painisntnormal.com",
  bookingUrl: "https://www.vagaro.com/dtmzh6",
  commerceUrl: "https://www.vagaro.com/dtmzh6/memberships",
  voiceId: "56bWURjYFHyYyVf490Dp"
});

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

const SYSTEM_PROMPT = `
You are Ali, the AI receptionist and booking assistant for Dynamic Touch Corrective Therapy in Loveland, Colorado.

BUSINESS FACTS
Business: Dynamic Touch Corrective Therapy
Public descriptor: Muscular Realignment Experts
Practitioner: Ja'Red Wheeler
Phone: (970) 682-3031
Address: 873 Cleveland Ave, Loveland, CO 80537
Website: https://www.painisntnormal.com
Booking: https://www.vagaro.com/dtmzh6
Packages/memberships: https://www.vagaro.com/dtmzh6/memberships

POSITIONING
Muscular Realignment is Dynamic Touch's flagship, goal-focused bodywork approach for recurring muscular tension, restricted movement, and pain patterns that keep returning. It is not relaxation-first massage.
Process: Talk → Observe → Work → Recheck → Next Steps.
Orthomyologic Manipulation is a secondary specialized hands-on offering. Do not invent details.

PRICING
30m $60; 45m $80; 60m $110; 75m $130; 90m $150; 2h $180; 2.5h $230; 3h $300; 4h $425.
Starting logic: newer/isolated concern → usually 60m. Concern 6+ months, several areas, or broader pattern → consider 90m. Never guarantee results.

PACKAGES
Reset 3 $300: 3x60m. Realign 6 $720: 6x75m, most popular. Total Reset 6 $825: 6x90m. Each may be shared with up to 3 family members/friends.

1LIFE1BODY
Reset $97/mo 1x60m. Corrective $149/mo 1x90m, most popular. Performance $229/mo 2x75m. Elite $349/mo 3x75m or 2x120m. Prenatal Support $169/mo 1 monthly prenatal Muscular Realignment. Do not invent policy terms.

INTENT RULE — CLASSIFY BY PURPOSE, NOT IDENTITY
Determine whom the call ultimately serves. Never classify solely from caller identity, phone number, automated/AI sound, or single keywords such as Google, AI, owner, services, pricing, availability, hours, appointment, or booking.
If purpose is unclear, use ambiguous and ask one concise purpose-revealing question.

Use one intent:
- prospective_client_booking: person seeks service/pricing/availability/appointment for self or another prospective client.
- third_party_customer_agent: Google AI or another legitimate agent acts for a specific human customer. Treat as a real customer opportunity. Human customer is the lead; platform agent is not.
- business_information_verification: legitimate caller/agent verifies public business information with no specific customer behind the request.
- solicitation_vendor: human or automated caller sells/promotes a B2B product/service to Dynamic Touch.
- existing_client: identifiable existing client calling about an appointment or normal client need.
- human_escalation_other: complaint, policy exception, private-account issue, concerning safety issue, or genuinely out-of-scope matter requiring a human.
- ambiguous: not enough evidence yet.

THIRD-PARTY CUSTOMER AGENTS
Cooperate naturally with Google/other AI agents representing real customers.
Answer approved service/pricing/public business questions.
Accept customer information legitimately supplied.
Never use the agent's caller number/email as the customer's contact.
If no reliable live availability is in runtime context, do not invent availability. Give the Vagaro booking handoff.
Google customer-agent source: "Google AI / GBP".

BUSINESS INFORMATION / VERIFICATION
May provide public business name, address, phone, services, approved pricing, appointment model, public booking info, and business hours only if runtime context supplies hours.
Never disclose client data, CRM/account details, revenue/financial information, private schedules, private owner information, internal systems, or TAC information.

SOLICITATION / VENDOR
Be brief and courteous.
Collect when obtainable: representative name, company, offered product/service, phone, email, brief reason.
Try for both phone and email, but do not loop if refused.
Do not transfer merely because they ask for the owner.
Do not promise a callback, claim interest, schedule a sales presentation, or reveal private contact/internal info.
Good wording:
"I can take your information and pass it along for review. What's your name, the company you're with, and what service or product are you offering?"
Then ask for best phone and email. Conclude after collecting what they will provide.

PROSPECTIVE CLIENT
Answer approved questions. When useful ask primary concern and duration. Capture available customer name, phone, email, concern, duration, requested/preferred time. Guide toward Vagaro booking.

EXISTING CLIENT
Do not create a duplicate new lead merely because an existing client calls. Help normally and escalate only when genuinely necessary.

SAFETY
Never diagnose, prescribe, guarantee, claim cure/permanent correction/root cause, invent credentials, invent availability, or tell someone to delay appropriate care. For severe, sudden, worsening, traumatic, neurological, systemic, or otherwise concerning symptoms recommend appropriate medical evaluation.

VOICE STYLE
Warm, natural, concise. One useful question at a time. Never announce internal labels/tags/analytics.

BOOKING TRUTH
Never say a booking is completed unless runtime context says bookingConfirmed=true.
Without live Vagaro availability, booking is a handoff, not a completed booking.

OUTPUT
Return only JSON matching the schema.
summary is concise operational CRM summary.
qualifiedLead=true only for genuine customer opportunity.
bookingAttempt=true when caller/agent actively tries to schedule.
bookingHandoff=true when directed to Vagaro/booking handoff.
resolvedWithoutHuman=true when Ali can appropriately finish without a human.
shouldCreateOrUpdateGhl=true only for: prospective lead with usable customer contact; third-party customer opportunity with usable HUMAN customer contact; solicitation/vendor with usable vendor contact; existing-client update when appropriate.
For third_party_customer_agent, customer fields MUST contain the human customer's info only.
For solicitation_vendor, vendor fields contain the seller's info.
`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    intent: { type: "string", enum: Object.values(INTENTS) },
    intentConfidence: { type: "number", minimum: 0, maximum: 1 },
    platformAgent: { type: "string" },
    qualifiedLead: { type: "boolean" },
    bookingAttempt: { type: "boolean" },
    bookingHandoff: { type: "boolean" },
    bookingOutcome: { type: "string", enum: ["none", "requested", "handoff", "completed", "unknown"] },
    humanEscalation: { type: "boolean" },
    resolvedWithoutHuman: { type: "boolean" },
    shouldCreateOrUpdateGhl: { type: "boolean" },
    customer: {
      type: "object", additionalProperties: false,
      properties: {
        name: { type: "string" }, phone: { type: "string" }, email: { type: "string" },
        concern: { type: "string" }, howLong: { type: "string" },
        requestedDateTime: { type: "string" }, alternativeDateTime: { type: "string" }
      },
      required: ["name","phone","email","concern","howLong","requestedDateTime","alternativeDateTime"]
    },
    vendor: {
      type: "object", additionalProperties: false,
      properties: {
        representative: { type: "string" }, company: { type: "string" }, offering: { type: "string" },
        phone: { type: "string" }, email: { type: "string" }, reason: { type: "string" }
      },
      required: ["representative","company","offering","phone","email","reason"]
    },
    summary: { type: "string" }
  },
  required: ["reply","intent","intentConfidence","platformAgent","qualifiedLead","bookingAttempt","bookingHandoff","bookingOutcome","humanEscalation","resolvedWithoutHuman","shouldCreateOrUpdateGhl","customer","vendor","summary"]
};

const submitted = new Map();

function clean(v="") { return String(v ?? "").replace(/^[\s:,-]+|[\s,.;]+$/g,"").replace(/\s+/g," ").trim(); }
function phoneKey(v="") { return String(v).replace(/\D/g,""); }
function usableContact(o={}) { return Boolean(clean(o.phone) || clean(o.email)); }
function messagesOf(v=[]) {
  return (Array.isArray(v) ? v : []).filter(m => m && ["user","assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim()).slice(-60).map(m => ({role:m.role, content:m.content.trim()}));
}
function contextOf(body={}, channel="web") {
  return {
    channel,
    callId: clean(body.callId || body.conversationId),
    callerPhone: clean(body.callerPhone),
    existingClient: typeof body.existingClient === "boolean" ? body.existingClient : null,
    publicBusinessHours: clean(body.publicBusinessHours),
    liveAvailability: body.liveAvailability && typeof body.liveAvailability === "object" ? body.liveAvailability : null,
    bookingConfirmed: body.bookingConfirmed === true,
    representingPlatform: clean(body.representingPlatform)
  };
}

async function sendLead(payload) {
  const key = phoneKey(payload.phone) ? `phone:${phoneKey(payload.phone)}` : clean(payload.email) ? `email:${clean(payload.email).toLowerCase()}` : "";
  if (!key) return {sent:false, reason:"missing-contact"};
  const signature = JSON.stringify(payload);
  if (submitted.get(key) === signature) return {sent:false, reason:"duplicate"};
  if (!process.env.LEAD_WEBHOOK_URL) return {sent:false, reason:"missing-webhook-url"};
  try {
    const r = await fetch(process.env.LEAD_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const t = await r.text();
    if (!r.ok) { console.error("GHL webhook failed",r.status,t); return {sent:false,reason:"webhook-error",status:r.status}; }
    submitted.set(key,signature);
    return {sent:true,status:r.status};
  } catch(e) { console.error("GHL webhook error",e); return {sent:false,reason:"webhook-exception"}; }
}

async function analytics(name, props={}) {
  const event = {event:name,timestamp:new Date().toISOString(),...props};
  console.log("ALI_EVENT",JSON.stringify(event));
  if (!process.env.ANALYTICS_WEBHOOK_URL) return {sent:false,reason:"missing-analytics-webhook",event};
  try {
    const r=await fetch(process.env.ANALYTICS_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(event)});
    return r.ok ? {sent:true,status:r.status,event} : {sent:false,reason:"analytics-webhook-error",status:r.status,event};
  } catch { return {sent:false,reason:"analytics-webhook-exception",event}; }
}

async function aiTurn(messages, ctx) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature:0.35,
      messages:[{role:"system",content:SYSTEM_PROMPT},{role:"system",content:`RUNTIME CONTEXT (facts only): ${JSON.stringify(ctx)}`},...messages],
      response_format:{type:"json_schema",json_schema:{name:"ali_turn",strict:true,schema:SCHEMA}}
    })
  });
  const text=await r.text();
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${text}`);
  const outer=JSON.parse(text);
  const turn=JSON.parse(outer?.choices?.[0]?.message?.content || "{}");
  if (!Object.values(INTENTS).includes(turn.intent)) throw new Error("Invalid Ali structured intent");
  if (ctx.bookingConfirmed) {
    turn.bookingOutcome="completed"; turn.bookingAttempt=true; turn.bookingHandoff=false;
  } else if (turn.bookingOutcome==="completed") {
    turn.bookingOutcome=turn.bookingHandoff ? "handoff" : "unknown";
  }
  return turn;
}

async function processTurn(req,res,channel) {
  try {
    const messages=messagesOf(req.body?.messages);
    if (!messages.length) return res.status(400).json({ok:false,reply:"Please send a message so I can help."});
    const ctx=contextOf(req.body || {},channel);
    const turn=await aiTurn(messages,ctx);

    let ghl={sent:false,reason:"not-applicable"};
    if (turn.shouldCreateOrUpdateGhl) {
      if (turn.intent===INTENTS.THIRD_PARTY && !usableContact(turn.customer)) ghl={sent:false,reason:"missing-human-customer-contact"};
      else if (turn.intent===INTENTS.SOLICITATION && !usableContact(turn.vendor)) ghl={sent:false,reason:"missing-vendor-contact"};
      else if ([INTENTS.INFO,INTENTS.AMBIGUOUS].includes(turn.intent)) ghl={sent:false,reason:"not-a-lead-record"};
      else ghl=await sendLead(buildGhlPayload(turn,ctx));
    }

    const base={channel,callId:ctx.callId,intent:turn.intent,source:sourceFor(turn,ctx)};
    const names=eventNamesFor(turn,channel);
    if (ghl.sent) names.push("ali_ghl_record_sent");
    const eventResults=await Promise.all([...new Set(names)].map(n=>analytics(n,base)));

    return res.json({
      ok:true, reply:turn.reply, intent:turn.intent, intentConfidence:turn.intentConfidence,
      source:sourceFor(turn,ctx), platformAgent:turn.platformAgent, qualifiedLead:turn.qualifiedLead,
      bookingAttempt:turn.bookingAttempt, bookingHandoff:turn.bookingHandoff, bookingOutcome:turn.bookingOutcome,
      humanEscalation:turn.humanEscalation, resolvedWithoutHuman:turn.resolvedWithoutHuman,
      bookingUrl:BUSINESS.bookingUrl, voiceId:channel==="voice"?BUSINESS.voiceId:undefined,
      ghl:{sent:ghl.sent,reason:ghl.reason||""},
      analytics:eventResults.map(x=>({event:x.event?.event||"",sent:x.sent,reason:x.reason||""}))
    });
  } catch(e) {
    console.error(`${channel} turn error`,e);
    return res.status(500).json({ok:false,reply:channel==="voice"?"I'm having trouble connecting right now. You can book at painisntnormal.com or call back shortly.":"AI service is temporarily unavailable. Please try again in a moment."});
  }
}

app.get("/",(req,res)=>res.json({
  ok:true,service:"Dynamic Touch AI running",assistant:"Ali",brainVersion:"voice-intent-v1",
  voiceId:BUSINESS.voiceId,voiceEndpoint:"/voice/turn",leadCapture:"enabled",
  analyticsWebhookConfigured:Boolean(process.env.ANALYTICS_WEBHOOK_URL),liveVagaroAvailability:false
}));

app.post("/chat",(req,res)=>processTurn(req,res,"web"));
app.post("/voice/turn",(req,res)=>processTurn(req,res,"voice"));

app.post("/voice/finalize",async(req,res)=>{
  const callId=clean(req.body?.callId), bookingOutcome=clean(req.body?.bookingOutcome||"unknown");
  if (!callId) return res.status(400).json({ok:false,message:"callId is required"});
  const base={channel:"voice",callId,intent:clean(req.body?.intent),source:clean(req.body?.source||"Ali Voice")};
  const names=["ali_call_finalized"];
  if (bookingOutcome==="completed") names.push("ali_booking_completed");
  if (bookingOutcome==="handoff") names.push("ali_booking_handoff");
  if (req.body?.resolvedWithoutHuman===true) names.push("ali_resolved_without_human");
  if (req.body?.humanEscalation===true) names.push("ali_human_escalation");
  await Promise.all(names.map(n=>analytics(n,{...base,bookingOutcome})));
  return res.json({ok:true,callId,bookingOutcome});
});

app.post("/lead",async(req,res)=>{
  try {
    const lead={
      source:clean(req.body?.source||"Ali Website Chat"),channel:clean(req.body?.channel||"web"),callId:clean(req.body?.callId),
      callType:clean(req.body?.callType||INTENTS.PROSPECT),tags:Array.isArray(req.body?.tags)?req.body.tags:["Ali - Prospective Client"],
      name:clean(req.body?.name),phone:clean(req.body?.phone),email:clean(req.body?.email),
      mainIssue:clean(req.body?.mainIssue),howLong:clean(req.body?.howLong),preferredTimes:clean(req.body?.preferredTimes),
      bookingAttempt:req.body?.bookingAttempt===true,bookingHandoff:req.body?.bookingHandoff===true,
      bookingOutcome:clean(req.body?.bookingOutcome||"none"),qualifiedLead:req.body?.qualifiedLead!==false,
      humanEscalation:req.body?.humanEscalation===true,resolvedWithoutHuman:req.body?.resolvedWithoutHuman===true,
      conversationSummary:clean(req.body?.conversationSummary||`Main issue: ${clean(req.body?.mainIssue)||"Not provided"} | How long: ${clean(req.body?.howLong)||"Not provided"} | Preferred times: ${clean(req.body?.preferredTimes)||"Not provided"}`),
      excludeFromCustomerConversion:false
    };
    lead.message=`${lead.conversationSummary} | Source: ${lead.source}`;
    if (!lead.phone && !lead.email) return res.status(400).json({ok:false,message:"Phone or email is required."});
    const result=await sendLead(lead);
    if (result.sent) await analytics("ali_ghl_record_sent",{channel:lead.channel,callId:lead.callId,intent:lead.callType,source:lead.source});
    return res.json({ok:true,message:"Lead received",webhookSent:result.sent,webhookReason:result.reason||""});
  } catch(e) {
    console.error("Lead error",e);
    return res.status(500).json({ok:false,message:"Lead capture failed"});
  }
});

const PORT=process.env.PORT||10000;
if (process.env.NODE_ENV!=="test") app.listen(PORT,()=>console.log("Dynamic Touch AI server running on port",PORT));
export { app };
