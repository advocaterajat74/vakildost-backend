// ==============================
// Vakil Dost AI - Backend Server
// ==============================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("Vakil Dost AI Backend is Running ✅");
});

// ==============================
// ✅ MAIN API ROUTE
// ==============================
app.post("/api/search", async (req, res) => {
  try {
    const { query, language } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Example response (replace later with OpenAI)
    const responseText = `You asked: "${query}" in ${language}`;

    res.json({
      success: true,
      answer: responseText
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/search", async (req, res) => {
  try {
    const {
      name,
      location,
      caseType,
      amount,
      facts,
      language,
    } = req.body;

    // 🔥 Lawyer-Level Prompt
    const prompt = `
You are a senior Indian lawyer (BCI compliant).

Rules:
- Give practical and realistic legal advice
- Use simple and clear language
- Mention relevant laws (e.g., NI Act 138, CPC, IT Act, Income Tax Act)
- Do NOT guarantee results
- Be professional and trustworthy
- If facts are unclear, ask 2 follow-up questions

Respond in ${language || "English"}.
If Hindi, use simple Hindi but keep legal terms in English.

-------------------------
Case Details:
Name: ${name || "Not provided"}
Location: ${location || "India"}
Case Type: ${caseType || "General"}
Amount: ${amount || "N/A"}
Facts: ${facts || "Not provided"}
-------------------------

Give answer in this format:

1. Legal Position  
2. Applicable Law  
3. What You Should Do Next  
4. Time Limits (if any)  
5. Draft Suggestion (if relevant)
`;

    // ✅ OpenAI API Call
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a highly experienced Indian advocate helping users understand legal issues clearly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    // ✅ Send Response
    res.json({
      success: true,
      reply: response.choices[0].message.content,
    });

  } catch (error) {
    console.error("ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
});

// ==============================
// ✅ START SERVER
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
