import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

// 🤖 AI問診
async function askGroq(msg, i = 0) {
  const model = MODELS[i];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `
你是台灣醫療AI：
- 使用繁體中文
- 不可診斷疾病
- 只做初步分診

輸出格式：
【可能原因】
【建議科別】
【建議處理】
【嚴重程度】

最後請附一句：
👉 建議就醫：是 / 否
`
        },
        { role: "user", content: msg }
      ]
    })
  });

  const data = await res.json();

  if (data.error) {
    if (i < MODELS.length - 1) return askGroq(msg, i + 1);
    return { reply: "AI錯誤：" + data.error.message };
  }

  return { reply: data.choices?.[0]?.message?.content };
}

// 🧠 chat
app.post("/chat", async (req, res) => {
  try {
    const result = await askGroq(req.body.message);
    res.json(result);
  } catch (e) {
    res.json({ reply: "系統錯誤：" + e.message });
  }
});

app.listen(3000, () => console.log("Medical AI V2 running"));
