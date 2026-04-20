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
你是醫療輔助AI：
- 使用繁體中文
- 不可做診斷
- 回答格式：
【評估】輕微 / 建議就醫 / 緊急
【建議】...
【科別】...
`
          },
          { role: "user", content: msg }
        ]
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "系統忙碌" });

  } catch {
    res.json({ reply: "系統錯誤" });
  }
});

app.listen(3000, () => console.log("Medical AI running"));
