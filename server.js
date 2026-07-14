require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // if using Node < 18

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ✅ Main API route
app.post("/api/search", async (req, res) => {
  try {
    const { query, language } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 🎯 Prompt for lawyer-style AI
    const prompt = `
You are a professional lawyer AI.

Give a clear, helpful legal answer.

User Question: ${query}

Respond in ${language || "English"} language.
Explain in simple terms.
    `;

    // ✅ OpenAI API call
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    // ✅ Extract response text
    const answer =
      data.output?.[0]?.content?.[0]?.text ||
      "No response from AI";

    res.json({
      success: true,
      answer
    });

  } catch (error) {
    console.error("Error:", error);

    res.status(500).json({
      error: "Something went wrong"
    });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
