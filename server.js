const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/search", async (req, res) => {
  const { query } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert Indian lawyer." },
      { role: "user", content: query }
    ]
  });

  res.json({ result: completion.choices[0].message.content });
});

app.listen(3000, () => console.log("Server running"));
