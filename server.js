import express from "express";
import cors from "cors";

const app = express();

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

/* =========================================================
   ALI SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT = `
You are Ali, the virtual assistant for Dynamic Touch Corrective Therapy in Loveland, Colorado.

PRIMARY GOAL
Help website visitors understand Muscular Realignment, answer questions clearly, recommend an appropriate starting session, collect lead information when appropriate, and guide visitors toward booking.

PERSONALITY
Warm, professional, knowledgeable, helpful, friendly, confident, concise, and never pushy. Use plain English and short responses.

BUSINESS INFORMATION
Business: Dynamic Touch Corrective Therapy
Website: https://www.painisntnormal.com
Phone: (970) 682-3031
Address: 873 Cleveland Ave, Loveland, CO 80537
Practitioner: Ja'Red Wheeler

Dynamic Touch specializes in Muscular Realignment. Do not position Dynamic Touch as a traditional massage or spa business.

WHAT IS MUSCULAR REALIGNMENT?
Muscular Realignment is Dynamic Touch's assessment-led, goal-focused form of corrective bodywork for recurring muscular tension, restricted movement, and pain patterns that keep returning.

A session may include:
- discussion of the client's goal and history
- movement observation
- targeted hands-on bodywork
- rechecking the original movement or concern
- guidance about what to notice afterward

Muscular Realignment does not diagnose medical conditions or guarantee outcomes.

HOW IT DIFFERS FROM RELAXATION MASSAGE
Traditional relaxation massage generally prioritizes relaxation and broad tension relief.

Muscular Realignment is organized around a specific concern, movement, or functional goal.

Clients may feel relaxed afterward, but relaxation is a benefit, not the primary focus.

COMMON REASONS PEOPLE CONTACT DYNAMIC TOUCH
People commonly ask about:
- neck and shoulder tension
- frozen shoulder support
- back pain
- hip and glute tension
- sciatica-like symptoms
- TMJ and jaw tension
- tension-type headaches
- carpal tunnel symptoms
- plantar fasciitis
- fibromyalgia
- scoliosis
- posture-related tension
- athletic or mobility restrictions
- chronic muscular tension

Never claim Dynamic Touch cures or diagnoses these conditions.

DISCOVERY QUESTIONS
Ask naturally when useful:
- What is bothering you most right now?
- How long has it been going on?
- Is it affecting work, sleep, exercise, or daily activities?
- Is it one area or several?
- What have you already tried?

SESSION PRICING
30 minutes: $60
45 minutes: $80
60 minutes: $110
75 minutes: $130
90 minutes: $150
2 hours: $180
2.5 hours: $230
3 hours: $300
4 hours: $425

STARTING RECOMMENDATION
For a newer or more isolated concern, 60 minutes is usually a reasonable starting point.

If the concern has been present for 6 months or longer, affects several areas, or appears to involve broader compensation patterns, recommend considering a 90-minute session.

Do not imply that a longer session guarantees a better result.

PACKAGES
Dynamic Touch offers three shareable Muscular Realignment packages.

Reset 3 — $300
3 x 60-minute sessions

Realign 6 — $720
6 x 75-minute sessions
This is the most popular package.

Total Reset 6 — $825
6 x 90-minute sessions

Packages may be shared with up to 3 family members or friends.

Packages are best for clients who want multiple sessions, better value, and flexibility without monthly billing.

1LIFE1BODY MEMBERSHIPS
Reset — $97/month
Includes 1 monthly 60-minute session.

Corrective — $149/month
Includes 1 monthly 90-minute session.

Performance — $229/month
Includes 2 monthly 75-minute sessions.

Elite — $349/month
Includes either 3 monthly 75-minute sessions or 2 monthly 120-minute sessions.

Prenatal Support — $169/month
Includes 1 monthly prenatal Muscular Realignment session.

Memberships are intended for clients who want ongoing care built into their routine.

ORTHOMYOLOGIC MANIPULATION
Dynamic Touch also offers Orthomyologic Manipulation as a specialized service.

Muscular Realignment remains the primary Dynamic Touch system and brand focus.

If someone specifically asks about Orthomyologic Manipulation, explain that it is a specialized hands-on service offered by Ja'Red. Do not invent details beyond the information available.

PRICE SHOPPERS
Do not compete only on price.

Explain the value of:
- goal-focused sessions
- individualized work
- movement observation
- targeted bodywork
- rechecking what changed
- a clearer next step

Then explain the available session, package, or membership options.

HOW MANY SESSIONS?
If asked how many sessions they will need, say:

"The number of sessions depends on how your body responds and what you are dealing with. Ja'Red can give you better guidance after seeing how you respond to your first session."

FIBROMYALGIA
Fibromyalgia does not automatically require a consultation first. Dynamic Touch works with clients who have fibromyalgia when bodywork is appropriate.

PREGNANCY
Pregnancy is not automatically a reason to decline or escalate because Dynamic Touch offers prenatal services. Appropriate modifications and safety considerations still apply.

MEDICAL AND SAFETY LIMITS
Never:
- diagnose
- prescribe
- guarantee pain relief
- claim to cure
- promise permanent correction
- claim to identify the root cause of a medical condition
- tell someone to delay appropriate medical care

If symptoms are severe, sudden, rapidly worsening, neurological, traumatic, or otherwise concerning, recommend appropriate medical evaluation.

LEAD CAPTURE
When someone wants to book, wants follow-up, or appears seriously interested, collect:
- name
- phone number
- email
- main concern
- how long it has been happening
- preferred appointment or follow-up time

If contact information has already been provided earlier in the conversation, do not ask for it again.

BOOKING
The website uses Vagaro for booking.

When a visitor is ready to book, encourage them to use the website's Book button or booking experience.

Do not invent appointment availability.

Do not claim you can see Vagaro's live appointment availability unless the application actually provides that information to you.

If helpful, direct them to:
https://www.painisntnormal.com

ESCALATION
Escalate to Ja'Red when:
- the visitor asks for medical advice
- the visitor has concerning or unclear symptoms
- the visitor requests a policy exception
- the visitor is upset or making a complaint
- the visitor specifically asks to speak with Ja'Red
- the question is outside your knowledge
- the request involves something you cannot confidently answer

STYLE
Keep replies concise and conversational.

Do not write long essays.

Ask only useful follow-up questions.

Do not pressure people into booking.

Your job is to help people understand their options and choose an appropriate next step.
`;

/* =========================================================
   LEAD HELPERS
========================================================= */

/*
  Stores the most recent payload signature submitted for each
  contact during this server process.

  This prevents identical duplicate webhook submissions while
  still allowing an enriched lead to be sent later when Ali
  learns the person's concern, duration, or preferred time.
*/
const submittedLeadSignatures = new Map();

function normalizePhone(phone = "") {
  return String(phone).replace(/[^0-9]/g, "");
}

function cleanValue(value = "") {
  return String(value)
    .replace(/^[\s:,-]+|[\s,.;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLeadKey(lead) {
  const phone = normalizePhone(lead.phone || "");
  const email = String(lead.email || "").trim().toLowerCase();

  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;

  return "";
}

function getLeadSignature(lead) {
  return JSON.stringify({
    name: cleanValue(lead.name || "").toLowerCase(),
    phone: normalizePhone(lead.phone || ""),
    email: String(lead.email || "").trim().toLowerCase(),
    mainIssue: cleanValue(lead.mainIssue || "").toLowerCase(),
    howLong: cleanValue(lead.howLong || "").toLowerCase(),
    preferredTimes: cleanValue(lead.preferredTimes || "").toLowerCase(),
  });
}

function allUserText(messages = []) {
  return messages
    .filter(
      (message) =>
        message &&
        message.role === "user" &&
        typeof message.content === "string"
    )
    .map((message) => message.content)
    .join("\n");
}

function findLastMatch(text, regex) {
  if (!text) return "";

  let match;
  let last = "";

  const flags = regex.flags.includes("g")
    ? regex.flags
    : `${regex.flags}g`;

  const globalRegex = new RegExp(regex.source, flags);

  while ((match = globalRegex.exec(text)) !== null) {
    last = match[1] || match[0] || "";

    // Safety guard for zero-length regex matches.
    if (match.index === globalRegex.lastIndex) {
      globalRegex.lastIndex++;
    }
  }

  return cleanValue(last);
}

/* =========================================================
   NAME EXTRACTION
========================================================= */

function extractName(text = "") {
  const patterns = [
    /(?:my name is|name is|this is)\s+([a-zA-Z][a-zA-Z' -]{1,50}?)(?=\s*(?:\.|,|\n|$|my phone|phone|my email|email|and my|number))/i,

    /(?:^|\n)\s*name\s*[:=-]\s*([a-zA-Z][a-zA-Z' -]{1,50})(?=\s*(?:\.|,|\n|$))/i,

    /(?:i am|i'm)\s+([a-zA-Z][a-zA-Z' -]{1,50}?)(?=\s*(?:\.|,|\n|$|and my|my phone|my email))/i,
  ];

  for (const pattern of patterns) {
    const value = findLastMatch(text, pattern);
    if (value) return value;
  }

  return "";
}

/* =========================================================
   MAIN ISSUE EXTRACTION
========================================================= */

function extractMainIssue(text = "") {
  const patterns = [
    // "My low back has been bothering me..."
    // "My right shoulder has been hurting..."
    /(?:my\s+)([a-zA-Z][a-zA-Z' -]{1,60}?)\s+(?:has|have)\s+been\s+(?:bothering|hurting|aching)/i,

    // "My right shoulder hurts..."
    // "My neck hurts..."
    /(?:my\s+)([a-zA-Z][a-zA-Z' -]{1,60}?)\s+(?:hurts|aches|is painful)/i,

    // "I've had shoulder pain for..."
    /(?:i(?:'ve| have)\s+had\s+)([a-zA-Z][a-zA-Z' -]{1,60}?)(?=\s+(?:for|since)\b|[.,\n]|$)/i,

    // "I have neck pain..."
    /(?:i\s+have\s+)([a-zA-Z][a-zA-Z' -]{1,60}?(?:pain|tension|tightness|discomfort|soreness))(?=\s+(?:for|since|and|but)\b|[.,\n]|$)/i,

    // "Pain in my shoulder..."
    /(?:pain|tension|tightness|discomfort|soreness)\s+(?:in|around)\s+(?:my\s+)?([a-zA-Z][a-zA-Z' -]{1,60}?)(?=\s+(?:for|since|and|but)\b|[.,\n]|$)/i,

    // Explicit field-like statements.
    /(?:main issue is|issue is|problem is|main concern is|concern is|dealing with|help with)\s+([^\n.]{2,90}?)(?=\s+(?:for|since|and|but)\b|[.,\n]|$)/i,
  ];

  for (const pattern of patterns) {
    const value = findLastMatch(text, pattern);
    if (value) return value;
  }

  return "";
}

/* =========================================================
   DURATION EXTRACTION
========================================================= */

function extractHowLong(text = "") {
  const patterns = [
    // "for 9 months", "for about 3 weeks", "for over a year"
    /\bfor\s+((?:(?:about|around|approximately|roughly|almost|nearly|over|more than|less than)\s+)?(?:\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|several|few)\s+(?:days?|weeks?|months?|years?))/i,

    // "since January", "since last summer"
    /\bsince\s+([a-zA-Z0-9][^.,\n]{1,40}?)(?=\s+(?:and|but)\b|[.,\n]|$)/i,

    // Explicit answers such as "How long: 8 months"
    /(?:how long|duration)\s*[:=-]\s*([^\n.]{1,50}?)(?=[.,\n]|$)/i,
  ];

  for (const pattern of patterns) {
    const value = findLastMatch(text, pattern);
    if (value) return value;
  }

  return "";
}

/* =========================================================
   PREFERRED TIME EXTRACTION
========================================================= */

function extractPreferredTimes(text = "") {
  const patterns = [
    // "Afternoons work best."
    // "Evenings work best for me."
    /\b(mornings?|afternoons?|evenings?|weekends?|weekdays?)\s+(?:work|works)\s+best\b/i,

    // "I prefer evenings."
    // "I prefer Tuesday afternoon."
    /(?:i\s+)?prefer(?:red)?\s+([^\n.]{2,80}?)(?=\s+(?:for|and|but)\b|[.,\n]|$)/i,

    // "My preferred time is mornings."
    /(?:preferred time|preferred appointment time|best time)\s*(?:is|would be|:|-)?\s*([^\n.]{2,80}?)(?=[.,\n]|$)/i,

    // "I'm available after 5."
    /(?:i am|i'm)\s+available\s+([^\n.]{2,80}?)(?=[.,\n]|$)/i,

    // "Availability: weekday evenings"
    /(?:availability|appointment|appt)\s*[:=-]\s*([^\n.]{2,80}?)(?=[.,\n]|$)/i,
  ];

  for (const pattern of patterns) {
    const value = findLastMatch(text, pattern);
    if (value) return value;
  }

  return "";
}

/* =========================================================
   LEAD EXTRACTION
========================================================= */

function extractLeadFromMessages(messages = []) {
  const text = allUserText(messages);

  const email = findLastMatch(
    text,
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );

  const phone = findLastMatch(
    text,
    /((?:\+1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4})/
  );

  const name = extractName(text);
  const mainIssue = extractMainIssue(text);
  const howLong = extractHowLong(text);
  const preferredTimes = extractPreferredTimes(text);

  const conversationSummary =
    "Main issue: " +
    (mainIssue || "Not provided") +
    " | How long: " +
    (howLong || "Not provided") +
    " | Preferred times: " +
    (preferredTimes || "Not provided");

  return {
    hasLead: Boolean(phone || email),
    name,
    phone,
    email,
    mainIssue,
    howLong,
    preferredTimes,
    message: conversationSummary + " | Source: Ali Website Chat",
    conversationSummary,
  };
}

/* =========================================================
   GHL WEBHOOK
========================================================= */

async function sendLeadToGHL(lead) {
  const key = getLeadKey(lead);

  if (!key) {
    console.log("Lead skipped: missing phone/email");
    return {
      sent: false,
      reason: "missing-contact",
    };
  }

  const signature = getLeadSignature(lead);
  const previousSignature = submittedLeadSignatures.get(key);

  if (previousSignature === signature) {
    console.log("Lead skipped: identical duplicate", key);
    return {
      sent: false,
      reason: "duplicate",
    };
  }

  console.log("NEW LEAD:", JSON.stringify(lead));

  if (!process.env.LEAD_WEBHOOK_URL) {
    console.log("No LEAD_WEBHOOK_URL set. Lead logged only.");
    return {
      sent: false,
      reason: "missing-webhook-url",
    };
  }

  try {
    const webhookResponse = await fetch(process.env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lead),
    });

    const webhookText = await webhookResponse.text();

    console.log(
      "GHL webhook response:",
      webhookResponse.status,
      webhookText
    );

    if (!webhookResponse.ok) {
      console.error(
        "GHL webhook failed:",
        webhookResponse.status,
        webhookText
      );

      return {
        sent: false,
        reason: "webhook-error",
        status: webhookResponse.status,
      };
    }

    // Only mark this exact payload as submitted after GHL accepts it.
    submittedLeadSignatures.set(key, signature);

    return {
      sent: true,
      status: webhookResponse.status,
    };
  } catch (error) {
    console.error("GHL webhook request error:", error);

    return {
      sent: false,
      reason: "webhook-exception",
    };
  }
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Dynamic Touch AI running",
    assistant: "Ali",
    leadCapture: "enabled",
    leadExtraction: "conversation-aware",
  });
});

/* =========================================================
   CHAT ENDPOINT
========================================================= */

app.post("/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured.");

      return res.status(500).json({
        reply: "AI service is temporarily unavailable. Please try again in a moment.",
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        reply: "Please send a message so I can help.",
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            ...messages,
          ],
          temperature: 0.6,
        }),
      }
    );

    const responseText = await openaiResponse.text();

    if (!openaiResponse.ok) {
      console.error(
        "OpenAI error:",
        openaiResponse.status,
        responseText
      );

      return res.status(500).json({
        reply: "AI service error - try again in a moment.",
      });
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("Unable to parse OpenAI response:", error);

      return res.status(500).json({
        reply: "AI response error - please try again.",
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("OpenAI response missing reply:", data);

      return res.status(500).json({
        reply: "AI response missing - please try again.",
      });
    }

    /*
      Lead extraction uses the full user-side conversation.

      If Ali first receives contact information and later learns
      more about the person's concern, the enriched lead can be
      submitted again because its signature has changed.
    */
    const lead = extractLeadFromMessages(messages);

    if (lead.hasLead) {
      await sendLeadToGHL(lead);
    }

    return res.json({
      reply,
    });
  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      reply: "Server hiccup - try again in a moment.",
    });
  }
});

/* =========================================================
   DIRECT LEAD ENDPOINT
========================================================= */

app.post("/lead", async (req, res) => {
  try {
    const name = cleanValue(req.body?.name || "");
    const phone = cleanValue(req.body?.phone || "");
    const email = cleanValue(req.body?.email || "");
    const mainIssue = cleanValue(req.body?.mainIssue || "");
    const howLong = cleanValue(req.body?.howLong || "");
    const preferredTimes = cleanValue(
      req.body?.preferredTimes || ""
    );

    if (!phone && !email) {
      return res.status(400).json({
        ok: false,
        message: "Phone or email is required.",
      });
    }

    const conversationSummary =
      "Main issue: " +
      (mainIssue || "Not provided") +
      " | How long: " +
      (howLong || "Not provided") +
      " | Preferred times: " +
      (preferredTimes || "Not provided");

    const lead = {
      hasLead: true,
      name,
      phone,
      email,
      mainIssue,
      howLong,
      preferredTimes,
      message:
        conversationSummary + " | Source: Ali Website Chat",
      conversationSummary,
    };

    const result = await sendLeadToGHL(lead);

    return res.json({
      ok: true,
      message: "Lead received",
      webhookSent: result.sent,
    });
  } catch (error) {
    console.error("Lead error:", error);

    return res.status(500).json({
      ok: false,
      message: "Lead capture failed",
    });
  }
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Dynamic Touch AI server running on port", PORT);
});
