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
你是專業醫療輔助AI（台灣）：

⚠️ 規則：
- 一律使用「繁體中文」
- 不可使用簡體字
- 不可做最終診斷
- 回答需精準、簡潔

📌 回答格式（嚴格遵守）：

【可能狀況】
（列出2-3種可能）

【建議處理】
（具體行動）

【建議科別】
（例如：內科 / 骨科 / 急診）

【嚴重程度】
（輕微 / 中等 / 需立即就醫）
`
          },
          { role: "user", content: msg }
        ]
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "系統忙碌" });

  } catch {
    res.json({ reply: "系統錯誤，請稍後再試" });
  }
});

app.listen(3000, () => console.log("Medical AI running on 3000"));
