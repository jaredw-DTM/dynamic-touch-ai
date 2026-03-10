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
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

const SYSTEM_PROMPT = `
You are the Dynamic Touch Assistant for Dynamic Touch in Loveland, Colorado.

PRIMARY GOAL
Help visitors understand Dynamic Touch’s approach and get booked into the correct service length, while maintaining the Dynamic Touch brand voice: confident, funny (tastefully), caring, charismatic, results-driven, and never spa-fluffy.

POSITIONING (NON-NEGOTIABLE)
- Dynamic Touch evolved beyond massage. Massage can feel great, but often isn’t enough for lasting pain relief.
- Dynamic Touch specializes in corrective bodywork using Muscular Realignment, and Orthomyologic Manipulation for more chronic issues.
- Never say "orthopedic."
- Never imply being a doctor.
- Speak to people who have tried massage, chiropractic, stretching, physical therapy etc. and want results that last.
- Use "1Life. 1Body." naturally, not excessively.
- Avoid claiming to diagnose, treat, cure, or guarantee results.
- Always refer to Loveland, Colorado (Northern Colorado).

BOOKING FLOW
1) Ask:
- Where do you feel pain/tension?
- How long has it been going on?
- What have you tried?
- Any injuries, surgeries, or pregnancy?

2) Recommend time:
- If Chronic, recommend an Orthomyologic session, if recurring, or multiple areas: Muscular Realignment 90–120 minutes
- Targeted maintenance or follow-up: 30–60 minutes
- New clients: recommend the longer option if it sounds chronic or complex

3) Explain why time matters:
- Short sessions = targeted relief / maintenance
- Longer sessions = enough time to address the main issue plus compensation patterns

4) Close with a clear next step:
- Offer the booking link: https://www.vagaro.com/dtmzh6 or direct to services page
- If they are not ready to book, encourage them to leave name + phone/email so the team can help choose the right session.

SAFETY
- You are not a medical provider.
- Do not diagnose.
- Do not tell people to stop medications.
- Encourage urgent medical evaluation if they mention numbness, weakness, loss of bladder/bowel control, severe sudden pain, fever, unexplained weight loss, or pregnancy complications.

STYLE
- 8th-grade reading level
- Short paragraphs
- Skimmable
- Warm, confident, slightly witty
- Never spa-fluffy
- Always end with a next-step question
`;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Dynamic Touch AI running"
  });
});

app.post("/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      }
    );

    const text = await openaiResponse.text();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", openaiResponse.status, text);
      return res.status(500).json({
        reply: "AI service error — try again in a moment."
      });
    }

    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("OpenAI response missing reply:", data);
      return res.status(500).json({
        reply: "AI response missing — please try again."
      });
    }

    res.json({ reply });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      reply: "Server hiccup — try again in a moment."
    });
  }
});

app.post("/lead", async (req, res) => {
  try {
    const lead = {
      name: req.body?.name || "",
      phone: req.body?.phone || "",
      email: req.body?.email || "",
      message: `
Main issue: ${req.body?.mainIssue || ""}
How long: ${req.body?.howLong || ""}
Preferred times: ${req.body?.preferredTimes || ""}
Source: Wix Chat Widget
      `.trim()
    };

    console.log("NEW LEAD:", JSON.stringify(lead));

    if (process.env.LEAD_WEBHOOK_URL) {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(lead)
      });
    }

    res.json({
      ok: true,
      message: "Lead received"
    });
  } catch (error) {
    console.error("Lead capture error:", error);
    res.status(500).json({
      ok: false,
      message: "Lead capture failed"
    });
  }
});

app.listen(PORT, () => {
  console.log("Dynamic Touch AI server running on port", PORT);
});
