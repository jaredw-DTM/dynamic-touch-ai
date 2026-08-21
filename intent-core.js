export const INTENTS = Object.freeze({
  PROSPECT: "prospective_client_booking",
  THIRD_PARTY: "third_party_customer_agent",
  INFO: "business_information_verification",
  SOLICITATION: "solicitation_vendor",
  EXISTING: "existing_client",
  ESCALATION: "human_escalation_other",
  AMBIGUOUS: "ambiguous"
});

function clean(v="") { return String(v ?? "").replace(/^[\s:,-]+|[\s,.;]+$/g,"").replace(/\s+/g," ").trim(); }

export function sourceFor(turn, ctx) {
  if (turn.intent === INTENTS.THIRD_PARTY) {
    return `${turn.platformAgent || ""} ${ctx.representingPlatform || ""}`.toLowerCase().includes("google") ? "Google AI / GBP" : "Third-Party Customer Agent";
  }
  if (turn.intent === INTENTS.SOLICITATION) return "Mia Voice - Solicitation";
  if (turn.intent === INTENTS.EXISTING) return "Mia Voice - Existing Client";
  if (turn.intent === INTENTS.INFO) return "Mia Voice - Business Information";
  if (turn.intent === INTENTS.ESCALATION) return "Mia Voice - Human Escalation";
  return ctx.channel === "voice" ? "Mia Voice" : "Mia Website Chat";
}

export function tagsFor(intent, platformAgent="") {
  if (intent === INTENTS.PROSPECT) return ["Mia - Prospective Client"];
  if (intent === INTENTS.THIRD_PARTY) return ["Mia - Prospective Client","Mia - Third-Party Customer Agent", ...(platformAgent.toLowerCase().includes("google") ? ["Google AI / GBP"] : [])];
  if (intent === INTENTS.SOLICITATION) return ["Solicitation - Mia"];
  if (intent === INTENTS.EXISTING) return ["Mia - Existing Client"];
  if (intent === INTENTS.INFO) return ["Mia - Business Information"];
  if (intent === INTENTS.ESCALATION) return ["Mia - Human Escalation"];
  return ["Mia - Ambiguous"];
}

export function buildGhlPayload(turn, ctx) {
  const source = sourceFor(turn, ctx);
  const common = {
    source, channel: ctx.channel, callId: ctx.callId, callType: turn.intent,
    intentConfidence: turn.intentConfidence, platformAgent: clean(turn.platformAgent || ctx.representingPlatform),
    tags: tagsFor(turn.intent, clean(turn.platformAgent || ctx.representingPlatform)),
    qualifiedLead: turn.qualifiedLead, bookingAttempt: turn.bookingAttempt, bookingHandoff: turn.bookingHandoff,
    bookingOutcome: turn.bookingOutcome, humanEscalation: turn.humanEscalation,
    resolvedWithoutHuman: turn.resolvedWithoutHuman, conversationSummary: clean(turn.summary),
    excludeFromCustomerConversion: turn.intent === INTENTS.SOLICITATION
  };
  if (turn.intent === INTENTS.SOLICITATION) {
    return {
      ...common, name:clean(turn.vendor.representative), phone:clean(turn.vendor.phone), email:clean(turn.vendor.email),
      company:clean(turn.vendor.company), productOrServiceOffered:clean(turn.vendor.offering), reasonForCall:clean(turn.vendor.reason),
      message:`Call Type: Solicitation / Vendor | Representative: ${clean(turn.vendor.representative)||"Not provided"} | Company: ${clean(turn.vendor.company)||"Not provided"} | Product / Service Offered: ${clean(turn.vendor.offering)||"Not provided"} | Phone: ${clean(turn.vendor.phone)||"Not provided"} | Email: ${clean(turn.vendor.email)||"Not provided"} | Reason for Call: ${clean(turn.vendor.reason)||"Not provided"} | Outcome: ${clean(turn.summary)||"Information captured for review"} | Source: ${source}`
    };
  }
  const c = {...turn.customer};
  if (turn.intent === INTENTS.PROSPECT && !clean(c.phone) && clean(ctx.callerPhone)) c.phone = ctx.callerPhone;
  return {
    ...common, name:clean(c.name), phone:clean(c.phone), email:clean(c.email),
    mainIssue:clean(c.concern), howLong:clean(c.howLong), preferredTimes:clean(c.requestedDateTime),
    alternativeDateTime:clean(c.alternativeDateTime), message:`${clean(turn.summary)} | Source: ${source}`
  };
}

// Compatibility note: existing ali_* analytics identifiers are intentionally retained
// so dashboards, webhook consumers, and historical reporting are not broken by the
// customer-facing rename from Ali to Mia.
export function eventNamesFor(turn, channel="voice") {
  const names = [];
  if (channel === "voice") names.push("ali_call_handled");
  const map = {
    [INTENTS.PROSPECT]:"ali_call_prospective_client",
    [INTENTS.THIRD_PARTY]:"ali_call_third_party_customer_agent",
    [INTENTS.INFO]:"ali_call_business_information",
    [INTENTS.SOLICITATION]:"ali_call_solicitation",
    [INTENTS.EXISTING]:"ali_call_existing_client",
    [INTENTS.ESCALATION]:"ali_call_human_escalation"
  };
  if (map[turn.intent]) names.push(map[turn.intent]);
  if (turn.qualifiedLead) names.push("ali_qualified_lead");
  if (turn.bookingAttempt) names.push("ali_booking_attempt");
  if (turn.bookingHandoff) names.push("ali_booking_handoff");
  if (turn.bookingOutcome === "completed") names.push("ali_booking_completed");
  if (turn.humanEscalation) names.push("ali_human_escalation");
  if (turn.resolvedWithoutHuman) names.push("ali_resolved_without_human");
  if (turn.intent === INTENTS.SOLICITATION && turn.resolvedWithoutHuman) names.push("ali_solicitation_intercepted");
  return [...new Set(names)];
}

export function fallbackIntent(text="") {
  const s=text.toLowerCase();
  if (/\b(my appointment|my upcoming appointment|i am already a client|i'm already a client|i have an appointment|reschedule my|cancel my appointment)\b/.test(s)) return INTENTS.EXISTING;
  if (/\b(we (?:sell|offer|provide)|i(?:'m| am) calling (?:to|about) (?:offer|sell)|help your business|grow your business|seo services|lead generation services|merchant processing|advertising package|marketing services)\b/.test(s)) return INTENTS.SOLICITATION;
  if (/\b(on behalf of (?:a|our|the) (?:customer|client)|representing (?:a|our|the) (?:customer|client)|customer would like|client would like)\b/.test(s)) return INTENTS.THIRD_PARTY;
  if (/\b(verify (?:your|the) business|business verification|confirm your address|confirm your business hours|updating (?:google|maps) business information)\b/.test(s)) return INTENTS.INFO;
  if (/\b(i (?:need|want) (?:an? )?(?:appointment|session|massage|bodywork|help)|i found you|i have (?:back|neck|shoulder|jaw|hip|glute|muscle|muscular|chronic|recurring)|my (?:back|neck|shoulder|jaw|hip|glute)|book (?:me|an? appointment)|available this afternoon|my pain|my tension)\b/.test(s)) return INTENTS.PROSPECT;
  return INTENTS.AMBIGUOUS;
}
