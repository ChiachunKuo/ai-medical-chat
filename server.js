import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const msg = req.body.message;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `
你是醫療問診AI：
1. 使用繁體中文
2. 不可做醫療診斷
3. 判斷嚴重程度（輕微 / 建議就醫 / 緊急）
4. 建議科別
5. 提供簡單自我處理方式
`
          },
          { role: "user", content: msg }
        ]
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices[0].message.content });

  } catch {
    res.json({ reply: "系統忙碌中，請稍後再試" });
  }
});

app.listen(3000);
