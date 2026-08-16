import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

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

BOOKING
The website uses Vagaro for booking.

When a visitor is ready to book, encourage them to use the website's Book button or booking experience.

Do not invent appointment availability.

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

const submittedLeadKeys = new Set();

function normalizePhone(phone = "") {
  return phone.replace(/[^0-9]/g, "");
}

function cleanValue(value = "") {
  return String(value)
    .replace(/^[\s:,-]+|[\s,.;]+$/g, "")
    .trim();
}

function getLeadKey(lead) {
  const phone = normalizePhone(lead.phone || "");
  const email = (lead.email || "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return "";
}

function latestUserText(messages = []) {
  return messages
    .filter((message) => message?.role === "user" && message?.content)
    .map((message) => message.content)
    .join("\n");
}

function findLastMatch(text, regex) {
  let match;
  let last = "";
  const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  while ((match = globalRegex.exec(text)) !== null) {
    last = match[1] || match[0] || "";
  }
  return cleanValue(last);
}

function extractName(text = "") {
  const patterns = [
    /(?:my name is|name is|this is|i am|i'm)\s+([a-zA-Z][a-zA-Z' -]{1,50})(?=\s*(?:\.|,|\n|$|my phone|phone|my email|email|and my|number))/i,
    /(?:^|\n)\s*name\s*[:=-]\s*([a-zA-Z][a-zA-Z' -]{1,50})/i
  ];

  for (const pattern of patterns) {
    const value = findLastMatch(text, pattern);
    if (value) return value;
  }

  return "";
}

function extractLeadFromMessages(messages = []) {
  const text = latestUserText(messages);

  const email = findLastMatch(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const phone = findLastMatch(text, /((?:\+1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4})/);
  const name = extractName(text);

  const mainIssue = findLastMatch(
    text,
    /(?:main issue is|issue is|problem is|dealing with|help with|pain in|pain is|i have|i've had|i am having|i'm having)\s+([^\n.]{2,90})/i
  );

  const howLong = findLastMatch(
    text,
    /(?:for|about|around|roughly|approximately)\s+(\d+\s*(?:days?|weeks?|months?|years?))/i
  );

  const preferredTimes = findLastMatch(
    text,
    /(?:prefer|preferred|best time|available|appointment|appt)\s+([^\n.]{2,90})/i
  );

  return {
    hasLead: Boolean(phone || email),
    name,
    phone,
    email,
    mainIssue,
    howLong,
    preferredTimes,
    message:
      "Main issue: " + mainIssue +
      " | How long: " + howLong +
      " | Preferred times: " + preferredTimes +
      " | Source: Ali Website Chat",
    conversationSummary:
  "Main issue: " + mainIssue +
  " | How long: " + howLong +
  " | Preferred times: " + preferredTimes
  };
}

async function sendLeadToGHL(lead) {
  const key = getLeadKey(lead);

  if (!key) {
    console.log("Lead skipped: missing phone/email");
    return;
  }

  if (submittedLeadKeys.has(key)) {
    console.log("Lead skipped: duplicate", key);
    return;
  }

  submittedLeadKeys.add(key);
  console.log("NEW LEAD:", JSON.stringify(lead));

  if (!process.env.LEAD_WEBHOOK_URL) {
    console.log("No LEAD_WEBHOOK_URL set. Lead logged only.");
    return;
  }

  const webhookResponse = await fetch(process.env.LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead)
  });

  const webhookText = await webhookResponse.text();
  console.log("GHL webhook response:", webhookResponse.status, webhookText);
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Dynamic Touch AI running",
    assistant: "Ali",
    leadCapture: "enabled",
    leadExtraction: "latest-user-messages"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.6
      })
    });

    const text = await openaiResponse.text();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", openaiResponse.status, text);
      return res.status(500).json({ reply: "AI service error - try again in a moment." });
    }

    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("OpenAI response missing reply:", data);
      return res.status(500).json({ reply: "AI response missing - please try again." });
    }

    const lead = extractLeadFromMessages(messages);
    if (lead.hasLead) await sendLeadToGHL(lead);

    return res.json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ reply: "Server hiccup - try again in a moment." });
  }
});

app.post("/lead", async (req, res) => {
  try {
    const lead = {
      name: req.body?.name || "",
      phone: req.body?.phone || "",
      email: req.body?.email || "",
      mainIssue: req.body?.mainIssue || "",
      howLong: req.body?.howLong || "",
      preferredTimes: req.body?.preferredTimes || "",
      message:
        "Main issue: " + (req.body?.mainIssue || "") +
        " | How long: " + (req.body?.howLong || "") +
        " | Preferred times: " + (req.body?.preferredTimes || "") +
        " | Source: Mia Website Chat"
    };

    await sendLeadToGHL(lead);
    return res.json({ ok: true, message: "Lead received" });
  } catch (error) {
    console.error("Lead error:", error);
    return res.status(500).json({ ok: false, message: "Lead capture failed" });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Dynamic Touch AI server running on port", PORT);
});
