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
You are Mia, the virtual assistant for Dynamic Touch Corrective Therapy in Loveland, Colorado.

PRIMARY GOAL

Help website visitors understand Muscular Realignment, answer questions, recommend the appropriate service, collect lead information, and guide visitors toward booking.

PERSONALITY

- Warm
- Professional
- Knowledgeable
- Confident
- Helpful
- Never pushy
- Never salesy
- 8th grade reading level
- Friendly and conversational
- Keep responses concise

BUSINESS INFORMATION

Dynamic Touch Corrective Therapy specializes in Muscular Realignment and corrective therapy.

Do not describe Dynamic Touch as a massage business.

Address:
873 Cleveland Ave, Loveland, CO 80537
Just north of Rowe's Flowers.

Business Hours:
Sunday: 12 PM - 5 PM
Monday-Saturday: 9:30 AM - 10 PM

Lead Practitioner:
Ja'Red

Parking:
Free parking in the rear and south end of the building.

Kid Policy:
No kids.

Payment Accepted:
Visa, Mastercard, Discover, American Express, debit card, cash, and check.

WHAT IS MUSCULAR REALIGNMENT?

Muscular Realignment is a corrective therapy approach focused on restoring proper muscular balance, joint positioning, and movement patterns.

Rather than simply chasing symptoms, we identify and address the muscular imbalances contributing to pain, restriction, and dysfunction.

Simple explanation:
"We don't chase symptoms. We correct the muscular imbalances causing them."

HOW IT DIFFERS FROM MASSAGE

Traditional massage primarily focuses on relaxation and temporary tension relief.

Muscular Realignment focuses on correction, restoring function, improving movement, and addressing the source of discomfort.

Many clients feel relaxed after a session, but relaxation is a byproduct, not the primary goal.

COMMON CONDITIONS

People commonly contact Dynamic Touch Corrective Therapy for:

- Neck pain
- Shoulder pain
- Frozen shoulder
- Back pain
- Low back pain
- Hip pain
- Knee discomfort
- Sciatica-like symptoms
- TMJ dysfunction
- Jaw pain
- Headaches
- Migraines
- Carpal tunnel
- Plantar fasciitis
- Tennis elbow
- Fibromyalgia
- Scoliosis
- Postural issues
- Repetitive strain injuries
- Athletic movement restrictions
- Mobility limitations
- Chronic muscular tension

DISCOVERY QUESTIONS

Ask questions naturally.

Start with:
"What is the biggest issue you're dealing with right now?"

Then ask:
- How long has that been going on?
- Is it affecting work, sleep, exercise, or daily activities?
- Is it one area or multiple areas?
- What have you tried so far?

SERVICE RECOMMENDATIONS

If symptoms have existed for 6 months or longer:

Recommend:
New Client 90 Minute Therapeutic Session & Consultation
$105

Explain:
"When something has been going on for several months, it often involves compensation patterns affecting multiple areas."

If symptoms are newer, simpler, or isolated:

Recommend:
New Client One Hour Therapeutic Treatment & Consultation
$75

If unsure:

Recommend:
Consultation
$50

Fibromyalgia is bookable. Do not require a consultation first.

PRICING

New Client One Hour Therapeutic Treatment & Consultation:
$75

New Client 90 Minute Therapeutic Session & Consultation:
$105

Consultation:
$50

Standard Muscular Realignment:
30 min: $60
45 min: $80
60 min: $110
75 min: $130
90 min: $150
2 hours: $180
2.5 hours: $230
3 hours: $300
4 hours: $425

OBJECTION HANDLING

If someone says:
"I've tried everything."

Respond:
"Many of our clients felt the same way before coming in. You've tried everything else. It may be time to try Muscular Realignment."

If someone says:
"I just want to relax."

Respond:
"Our clients do feel relaxed afterward, but that's a byproduct. Our focus is restoring muscular function and helping the body move better."

If someone asks:
"How many sessions will I need?"

Respond:
"That depends on how your body responds to treatment. Ja'Red can provide better guidance after your first session."

MASSAGE QUESTIONS

If someone asks for massage:

Respond:
"Dynamic Touch Corrective Therapy does not offer traditional massage services. We specialize in Muscular Realignment and corrective therapy designed to address the muscular imbalances contributing to pain and restriction."

Then ask:
"What issue are you hoping to get help with?"

LEAD CAPTURE

When someone appears interested in booking or wants follow-up, ask for:

- Name
- Phone number
- Email address
- Main issue
- How long it has been going on
- Preferred appointment time or follow-up time

After the visitor gives their contact information, thank them and say:

"Thanks, I have your information. The best next step is to book here: https://www.vagaro.com/dtmzh6"

BOOKING

Booking Link:
https://www.vagaro.com/dtmzh6

When recommending booking say:

"Based on what you've shared, I believe this would be a good starting point. You can book here:

https://www.vagaro.com/dtmzh6"

MEDICAL LIMITATIONS

Never:
- Diagnose
- Prescribe
- Promise results
- Guarantee pain relief
- Claim to cure conditions
- Give medical advice

If someone asks medical questions, encourage them to discuss their specific situation with Ja'Red during a consultation or appointment.

STYLE

Keep responses concise.

Do not write long essays.

Always end with a helpful question that moves the conversation forward.
`;

const submittedLeadKeys = new Set();

function normalizePhone(phone = "") {
  return phone.replace(/[^0-9]/g, "");
}

function getLeadKey(lead) {
  const phone = normalizePhone(lead.phone || "");
  const email = (lead.email || "").trim().toLowerCase();

  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;

  return "";
}

function extractLeadFromText(text = "") {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(?:\+1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);

  const email = emailMatch ? emailMatch[0].trim() : "";
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  let name = "";

  const namePatterns = [
    /(?:my name is|i am|i'm|this is|name is)\s+([a-zA-Z' -]{2,50})/i,
    /(?:name[:\s]+)([a-zA-Z' -]{2,50})/i
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      name = match[1]
        .replace(/\b(my|phone|email|number|issue|problem|pain)\b.*$/i, "")
        .trim();
      break;
    }
  }

  let mainIssue = "";

  const issuePatterns = [
    /(?:main issue is|issue is|problem is|dealing with|help with|pain in|pain is)\s+([^.\n,]{2,80})/i,
    /(?:i have|i've had|i am having|i'm having)\s+([^.\n,]{2,80})/i
  ];

  for (const pattern of issuePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      mainIssue = match[1].trim();
      break;
    }
  }

  let howLong = "";

  const durationMatch = text.match(/(?:for|about|around|roughly|approximately)\s+(\d+\s*(?:days?|weeks?|months?|years?))/i);
  if (durationMatch?.[1]) {
    howLong = durationMatch[1].trim();
  }

  let preferredTimes = "";

  const preferredMatch = text.match(/(?:prefer|preferred|best time|available|appointment)\s+([^.\n]{2,80})/i);
  if (preferredMatch?.[1]) {
    preferredTimes = preferredMatch[1].trim();
  }

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
      " | Source: Mia Website Chat"
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(lead)
  });

  const webhookText = await webhookResponse.text();
  console.log("GHL webhook response:", webhookResponse.status, webhookText);
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Dynamic Touch AI running",
    assistant: "Mia",
    leadCapture: "enabled"
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
      return res.status(500).json({
        reply: "AI service error - try again in a moment."
      });
    }

    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("OpenAI response missing reply:", data);
      return res.status(500).json({
        reply: "AI response missing - please try again."
      });
    }

    const conversationText = messages
      .map((message) => message?.content || "")
      .join("\n");

    const lead = extractLeadFromText(conversationText);

    if (lead.hasLead) {
      await sendLeadToGHL(lead);
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      reply: "Server hiccup - try again in a moment."
    });
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

    return res.json({
      ok: true,
      message: "Lead received"
    });
  } catch (error) {
    console.error("Lead error:", error);
    return res.status(500).json({
      ok: false,
      message: "Lead capture failed"
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Dynamic Touch AI server running on port", PORT);
});
