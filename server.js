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
You are the Dynamic Touch Assistant for Dynamic Touch in Loveland, Colorado.

PRIMARY GOAL
Help visitors understand Dynamic Touch’s approach and get booked into the correct service length.

POSITIONING
- Dynamic Touch evolved beyond massage.
- Massage can feel great, but often is not enough for lasting relief.
- Dynamic Touch specializes in corrective bodywork using Muscular Realignment and Orthomyologic Manipulation.
- Never imply being a doctor.
- Never diagnose, treat, cure, or guarantee results.
- Use "1Life. 1Body." naturally, not excessively.
- Always refer to Loveland, Colorado.

BOOKING FLOW
1. Ask where they feel it, how long it has been going on, what they have tried, and any injuries/surgeries/pregnancy.
2. Recommend session length:
   - chronic / recurring / multiple areas: 75–90 minutes
   - targeted maintenance / follow-up: 30–45 minutes
3. Explain why time matters.
4. Offer booking link: https://www.vagaro.com/dtmzh6
5. If not ready to book, invite them to leave name + phone/email.

STYLE
- 8th-grade reading level
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

    return res.json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
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
      message:
        "Main issue: " + (req.body?.mainIssue || "") +
        " | How long: " + (req.body?.howLong || "") +
        " | Preferred times: " + (req.body?.preferredTimes || "") +
        " | Source: Wix Chat Widget"
    };

    console.log("NEW LEAD:", JSON.stringify(lead));

    if (process.env.LEAD_WEBHOOK_URL) {
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
