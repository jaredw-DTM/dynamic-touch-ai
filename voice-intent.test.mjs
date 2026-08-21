import assert from "node:assert/strict";
import { fallbackIntent, INTENTS, buildGhlPayload, sourceFor, eventNamesFor } from "./intent-core.js";

const cases = [
  ["A normal prospective client","My low back has been bothering me for 9 months and I want an appointment.",INTENTS.PROSPECT],
  ["B Google AI customer booking","I'm an automated Google agent calling on behalf of a customer who wants to book a 60 minute session.",INTENTS.THIRD_PARTY],
  ["C Google AI pricing availability","I'm calling on behalf of a customer. Do you offer Muscular Realignment, what is the price, and is Tuesday at 3 available?",INTENTS.THIRD_PARTY],
  ["D Google info verification","This is an automated call to verify your business address and business hours for Google Maps.",INTENTS.INFO],
  ["E human salesperson","I'm calling to offer marketing services to help your business grow.",INTENTS.SOLICITATION],
  ["F AI salesperson","Automated agent here. We provide SEO services and lead generation services for local businesses.",INTENTS.SOLICITATION],
  ["G speak to owner","I'd like to speak to the owner.",INTENTS.AMBIGUOUS],
  ["H solicitor refuses info","We offer advertising packages, but I don't want to provide my email.",INTENTS.SOLICITATION],
  ["I false positive protection","I found you on Google and wanted to know if you have anything available this afternoon.",INTENTS.PROSPECT],
  ["J existing client","I'm already a client and I have an appointment Friday. I need to reschedule my appointment.",INTENTS.EXISTING],
  ["K ambiguous automated","This is an automated caller. I have a question about your services and availability.",INTENTS.AMBIGUOUS]
];

for (const [name,text,expected] of cases) {
  assert.equal(fallbackIntent(text), expected, name);
}

const thirdPartyTurn = {
  intent:INTENTS.THIRD_PARTY,intentConfidence:.95,platformAgent:"Google AI",
  qualifiedLead:true,bookingAttempt:true,bookingHandoff:true,bookingOutcome:"handoff",
  humanEscalation:false,resolvedWithoutHuman:true,
  customer:{name:"Sam Client",phone:"9705551111",email:"sam@example.com",concern:"back pain",howLong:"9 months",requestedDateTime:"Tuesday 3pm",alternativeDateTime:""},
  vendor:{representative:"",company:"",offering:"",phone:"",email:"",reason:""},summary:"Google agent requested booking for Sam."
};
const ctx={channel:"voice",callId:"call-1",callerPhone:"8885550000",representingPlatform:"Google",bookingConfirmed:false};
const payload=buildGhlPayload(thirdPartyTurn,ctx);
assert.equal(payload.phone,"9705551111","third-party customer phone must be the human customer's phone");
assert.notEqual(payload.phone,ctx.callerPhone,"must not use agent caller ID as customer phone");
assert.equal(sourceFor(thirdPartyTurn,ctx),"Google AI / GBP");
assert.ok(payload.tags.includes("Google AI / GBP"));
assert.ok(eventNamesFor(thirdPartyTurn).includes("ali_call_third_party_customer_agent"));

const vendorTurn={...thirdPartyTurn,intent:INTENTS.SOLICITATION,platformAgent:"",qualifiedLead:false,bookingAttempt:false,bookingHandoff:false,bookingOutcome:"none",
  customer:{name:"",phone:"",email:"",concern:"",howLong:"",requestedDateTime:"",alternativeDateTime:""},
  vendor:{representative:"Alex Sales",company:"SEO Co",offering:"SEO",phone:"3035557777",email:"alex@seo.example",reason:"Sell SEO"},summary:"Vendor pitch captured."
};
const vp=buildGhlPayload(vendorTurn,{...ctx,representingPlatform:""});
assert.ok(vp.tags.includes("Solicitation - Ali"));
assert.equal(vp.excludeFromCustomerConversion,true);
assert.ok(eventNamesFor({...vendorTurn,resolvedWithoutHuman:true}).includes("ali_solicitation_intercepted"));

console.log(`PASS ${cases.length} required intent scenarios + CRM/analytics safeguards`);
