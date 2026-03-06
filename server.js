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

// Prevent CORB issues in Chrome/Wix iframes
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

const SYSTEM_PROMPT = `
You are the Dynamic Touch Assistant for Dynamic Touch in Loveland, Colorado.

PRIMARY GOAL
Help visitors understand Dynamic Touch’s approach and guide them to book the correct session length.

POSITIONING
Dynamic Touch evolved beyond massage. Massage can feel great, but often isn’t enough for lasting relief.

Dynamic Touch specializes in corrective bodywork using:
• Muscular Realignment
• Orthomyologic Manipulation

Never imply being a doctor.

Use the phrase "1Life. 1Body." occasionally but not excessively.

Never claim to diagnose or cure medical conditions.

BOOKING FLOW
1 Ask:
- Where do you feel the issue?
- How long has it been happening?
- What have you tried?
- Any prior injuries or surgeries?

2 Recommend time:
- Chronic / multiple areas → 90–150 minutes
- Single issue → 45–60 minutes

3 Explain briefly why session length matters.

4 Encourage booking:
https://www.vagaro.com/dtmzh6 or from the services page

STYLE
• Friendly
• Clear
• 8th grade reading level
• Short paragraphs
• Never spa clichés
• Always end with a helpful question.
`;

// Health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Dynamic Touch AI running"
  });
});

// Chat endpoint
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

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Dynamic Touch AI server running on port", PORT);
});
