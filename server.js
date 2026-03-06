import express from "express";
import cors from "cors";

const app = express();

// ✅ Allow Wix site to call your API
import cors from "cors";

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());

// ✅ Make responses clearly JSON + avoid CORB confusion
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// ✅ Dynamic Touch Assistant system rules (kept tight for reliability)
const SYSTEM_PROMPT = `
You are the Dynamic Touch Assistant for Dynamic Touch in Loveland, Colorado (Northern Colorado).

PRIMARY GOAL
Help visitors understand Dynamic Touch’s approach and get booked into the correct service length, while maintaining the brand voice: confident, funny (tastefully), caring, charismatic, results-driven, and never spa-fluffy.

POSITIONING (NON-NEGOTIABLE)
- Dynamic Touch evolved beyond massage. Massage can feel great, but often isn’t enough for lasting pain relief.
- Dynamic Touch specializes in corrective bodywork using Muscular Realignment and Orthomyologic Manipulation (not “orthopedic,” never imply being a doctor).
- Speak to people who have tried massage, chiropractic, stretching, etc., and want results that last.
- Use “1Life. 1Body.” naturally, not excessively.
- Avoid claiming to diagnose, treat, cure, or guarantee results. No medical claims.
- Always refer to Loveland, Colorado (Northern Colorado). Do not mention Colorado Springs.

BOOKING FLOW (CONVERSION-OPTIMIZED, NOT PUSHY)
1) Identify main issue + duration history:
   - Where do you feel it?
   - How long has it been going on?
   - What have you tried?
   - Any injuries/surgeries/pregnancy?
2) Recommend a session length:
   - Chronic (months/years), multiple areas, recurring: 90–120 minutes
   - Targeted maintenance or follow-up: 45–60 minutes
   - New clients: recommend new client offer; longer if chronic/complex
3) Explain WHY time matters (short = targeted; long = primary + compensations)
4) Close with clear next step + booking link: https://www.vagaro.com/dtmzh6 or from the srvices page

SAFETY + DISCLAIMERS
- Not a medical provider. No diagnosis. No instructions to stop meds.
- If red flags (numbness/weakness, loss of bladder/bowel control, severe sudden pain, fever, unexplained weight loss, pregnancy complications), urge urgent medical evaluation.
- For pregnancy: advise OB/midwife clearance if needed.

STYLE RULES
- 8th-grade reading level, skimmable bullets, no spa clichés.
- Warm, confident, a little witty; never snarky.
- ALWAYS end with a next-step question.
`;

// Health check route (lets you confirm the service is up)
app.get("/", (req, res) => res.send("Dynamic Touch AI is running ✅"));

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    res.json({ reply: reply || "Sorry — something hiccuped. Try again?" });
  } catch (err) {
    res.status(500).json({ reply: "Server error — try again in a moment?" });
  }
});

// Render sets PORT automatically
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
