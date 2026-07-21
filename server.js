require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const VERSION = "2026-07-21-final";
const PORT = Number(process.env.PORT) || 10000;

const allowedOrigins = new Set([
  "https://vakildost.in",
  "https://www.vakildost.in"
]);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server tools and same-origin requests without an Origin header.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-VakilDost-Version", VERSION);
  console.log(
    new Date().toISOString(),
    req.method,
    req.originalUrl,
    "origin=" + (req.headers.origin || "none")
  );
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Vakil Dost AI Backend",
    status: "running",
    version: VERSION
  });
});

app.get("/health", (req, res) => {
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);

  res.status(apiKeyConfigured ? 200 : 503).json({
    success: apiKeyConfigured,
    service: "Vakil Dost AI Backend",
    status: apiKeyConfigured ? "ready" : "missing_openai_api_key",
    version: VERSION,
    apiKeyConfigured
  });
});

app.get("/api/search", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vakil Dost AI endpoint is online. Send a POST request to receive guidance.",
    version: VERSION
  });
});

function clean(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function extractOutputText(data) {
  if (!data || typeof data !== "object") return "";

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) return "";

  return data.output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter(
      (part) =>
        part &&
        part.type === "output_text" &&
        typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

app.post("/api/search", async (req, res) => {
  const requestStartedAt = Date.now();

  try {
    const body = req.body || {};

    const name = clean(body.name, 80);
    const location = clean(body.location, 100);
    const caseType = clean(body.caseType || body.issue, 100);
    const amount = clean(body.amount, 50);
    const language = clean(
      body.language || body.preferredLanguage || "English",
      30
    );

    // Accept every field name used by the old and new homepages.
    const facts = clean(
      body.facts || body.query || body.problem || body.message,
      5000
    );

    if (facts.length < 20) {
      return res.status(400).json({
        success: false,
        error: "Please describe the legal problem in at least 20 characters.",
        version: VERSION
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured in Render.");

      return res.status(503).json({
        success: false,
        error: "The AI service is not configured. Add OPENAI_API_KEY in Render Environment.",
        version: VERSION
      });
    }

    const instructions = `You are Vakil Dost AI, an Indian legal-information assistant.

Give general educational legal information, not a guarantee or substitute for an advocate who has reviewed the documents.

Rules:
- Apply Indian legal context.
- Respond in ${language || "English"}.
- Use clear, simple and practical language.
- Personalise the answer using the supplied facts, location and issue.
- Do not invent statutes, sections, judgments, dates or facts.
- State uncertainty where the answer depends on missing facts, jurisdiction, documents or current law.
- Never promise success.
- For immediate danger, arrest, violence, self-harm, urgent court deadlines or emergencies, advise prompt contact with the appropriate authority or a qualified advocate.

Use this structure:
## Understanding of your problem
## Likely legal position
## Recommended next steps
## Documents and evidence to preserve
## Important deadlines or limitation concerns
## Questions that could change the answer
## When professional review is advisable
## Important disclaimer`;

    const input = [
      `Name: ${name || "Not provided"}`,
      `Location: ${location || "Not provided"}`,
      `Legal issue: ${caseType || "Not selected"}`,
      `Amount involved: ${amount || "Not provided"}`,
      `Preferred language: ${language || "English"}`,
      "",
      "User's facts:",
      facts
    ].join("\n");

    const openAIController = new AbortController();
    const openAITimeout = setTimeout(() => openAIController.abort(), 60000);

    let openAIResponse;

    try {
      openAIResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions,
          input,
          max_output_tokens: 1400,
          store: false
        }),
        signal: openAIController.signal
      });
    } finally {
      clearTimeout(openAITimeout);
    }

    const rawText = await openAIResponse.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error(
        "OpenAI returned non-JSON:",
        openAIResponse.status,
        rawText.slice(0, 1000)
      );

      return res.status(502).json({
        success: false,
        error: "The AI provider returned an unreadable response.",
        version: VERSION
      });
    }

    if (!openAIResponse.ok) {
      const providerMessage =
        data?.error?.message ||
        data?.message ||
        "The AI provider rejected the request.";

      console.error(
        "OpenAI error:",
        openAIResponse.status,
        JSON.stringify(data).slice(0, 3000)
      );

      return res.status(openAIResponse.status).json({
        success: false,
        error: providerMessage,
        version: VERSION
      });
    }

    const answer = extractOutputText(data);

    if (!answer) {
      console.error(
        "No output text in OpenAI response:",
        JSON.stringify(data).slice(0, 3000)
      );

      return res.status(502).json({
        success: false,
        error: "The AI returned an empty answer. Please submit the question again.",
        version: VERSION
      });
    }

    console.log(
      "AI response completed in",
      Date.now() - requestStartedAt,
      "ms"
    );

    return res.status(200).json({
      success: true,
      answer,
      version: VERSION
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      console.error("OpenAI request timed out.");

      return res.status(504).json({
        success: false,
        error: "The AI request timed out. Please try once more.",
        version: VERSION
      });
    }

    console.error("Unhandled /api/search error:", error);

    return res.status(500).json({
      success: false,
      error: "The server could not generate legal guidance.",
      version: VERSION
    });
  }
});

app.use((error, req, res, next) => {
  if (error?.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "This website origin is not permitted.",
      version: VERSION
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON request body.",
      version: VERSION
    });
  }

  console.error("Express error:", error);

  return res.status(500).json({
    success: false,
    error: "Unexpected server error.",
    version: VERSION
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Vakil Dost AI backend ${VERSION} running on port ${PORT}`);
});
