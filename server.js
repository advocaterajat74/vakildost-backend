require(“dotenv”).config();

const express = require(“express”); const cors = require(“cors”); const
rateLimit = require(“express-rate-limit”);

const app = express(); app.disable(“x-powered-by”); app.set(“trust
proxy”, 1);

const VERSION = “2026-07-25-structured-v6”; const PORT =
Number(process.env.PORT) || 10000;

app.use(cors()); app.use(express.json());

app.get(“/”, (req,res)=>{ res.json({ success:true, service:“Vakil Dost
AI Backend”, version:VERSION }); });

app.get(“/health”,(req,res)=>{ res.json({ success:true, version:VERSION,
apiKeyConfigured:Boolean(process.env.OPENAI_API_KEY) }); });

app.post(“/api/search”, async (req,res)=>{ res.json({ success:true,
answer:“Backend is working. Replace this route with your OpenAI logic.”,
version:VERSION }); });

app.listen(PORT,()=>{
console.log(Vakil Dost AI backend ${VERSION} running on port ${PORT});
});
