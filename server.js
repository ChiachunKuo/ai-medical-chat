import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 🧠 醫療問診 Prompt（穩定版）
function buildPrompt(input) {
  return `
你是一個專業醫療問診AI助手。

規則：
- 先問症狀，不要直接診斷
- 每次最多問3個問題
- 最後要建議掛號科別
- 語氣像醫生

使用者症狀：${input}
`;
}

// 🔥 Groq API 呼叫
async function askAI(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "你是專業醫療問診AI，必須用醫生方式問診，不可直接診斷"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })
  });

  const data = await res.json();

  console.log("GROQ RESPONSE:", JSON.stringify(data));

  if (!res.ok) {
    throw new Error(data.error?.message || "Groq API error");
  }

  return data.choices[0].message.content;
}

// 💬 Chat API
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const reply = await askAI(buildPrompt(userMessage));

    res.json({ reply });
  } catch (err) {
    console.log("ERROR:", err.message);
    res.json({ reply: "系統暫時忙碌，請稍後再試" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
console.log("GROQ KEY:", process.env.GROQ_API_KEY);
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${GROQ_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "llama3-8b-8192",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 200
  })
});

console.log("STATUS:", res.status);

const text = await res.text();
console.log("RAW RESPONSE:", text);
